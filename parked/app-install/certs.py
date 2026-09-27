"""HTTPS certificates for hosting a party on the local network.

Phones only install web apps from trusted HTTPS pages, and no public
certificate authority will issue certificates for private IPs such as
192.168.1.27. So the host makes its own small certificate authority (CA),
which each phone trusts once, and uses it to sign a server certificate for
its current network addresses.

The CA is name-constrained to private addresses and *.local, so even if its
key leaked it could not be used to impersonate real websites on the phones
that trust it.
"""
import datetime
import ipaddress
import os
import socket
import ssl

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import ec
from cryptography.x509.oid import ExtendedKeyUsageOID, NameOID

PRIVATE_NETS = ["10.0.0.0/8", "172.16.0.0/12", "192.168.0.0/16", "127.0.0.0/8", "169.254.0.0/16"]
LEAF_DAYS = 397          # Apple and Chrome reject server certificates valid for longer
RENEW_BEFORE_DAYS = 30


def _now():
    return datetime.datetime.now(datetime.timezone.utc)


def _write(path, data, private=False):
    tmp = path + ".tmp"
    with open(tmp, "wb") as f:
        f.write(data)
    if private:
        try:
            os.chmod(tmp, 0o600)
        except OSError:
            pass
    os.replace(tmp, path)


class CertStore:
    def __init__(self, directory):
        self.dir = directory
        self.ca_key_path = os.path.join(directory, "ca.key")
        self.ca_crt_path = os.path.join(directory, "ca.crt")
        self.key_path = os.path.join(directory, "server.key")
        self.crt_path = os.path.join(directory, "server.crt")

    # ------------------------------------------------------------ CA
    def ca(self):
        """Load the CA, creating it the first time."""
        if os.path.exists(self.ca_key_path) and os.path.exists(self.ca_crt_path):
            with open(self.ca_key_path, "rb") as f:
                key = serialization.load_pem_private_key(f.read(), None)
            with open(self.ca_crt_path, "rb") as f:
                return key, x509.load_pem_x509_certificate(f.read())
        os.makedirs(self.dir, exist_ok=True)
        key = ec.generate_private_key(ec.SECP256R1())
        name = x509.Name([
            x509.NameAttribute(NameOID.COMMON_NAME, f"Pack Rat Local CA ({socket.gethostname()})"),
            x509.NameAttribute(NameOID.ORGANIZATION_NAME, "Pack Rat party host"),
        ])
        now = _now()
        permitted = [x509.IPAddress(ipaddress.ip_network(n)) for n in PRIVATE_NETS]
        permitted += [x509.DNSName("local"), x509.DNSName("localhost")]
        cert = (
            x509.CertificateBuilder()
            .subject_name(name).issuer_name(name)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=3650))
            .add_extension(x509.BasicConstraints(ca=True, path_length=0), critical=True)
            .add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=True, crl_sign=True,
                                         content_commitment=False, key_encipherment=False, data_encipherment=False,
                                         key_agreement=False, encipher_only=False, decipher_only=False), critical=True)
            .add_extension(x509.NameConstraints(permitted_subtrees=permitted, excluded_subtrees=None), critical=True)
            .add_extension(x509.SubjectKeyIdentifier.from_public_key(key.public_key()), critical=False)
            .sign(key, hashes.SHA256())
        )
        _write(self.ca_key_path, key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                   serialization.NoEncryption()), private=True)
        _write(self.ca_crt_path, cert.public_bytes(serialization.Encoding.PEM))
        return key, cert

    def ca_der(self):
        """The CA certificate in the DER form phones expect when installing."""
        return self.ca()[1].public_bytes(serialization.Encoding.DER)

    # ------------------------------------------------------------ server certificate
    def _leaf_ok(self, ips, names):
        if not (os.path.exists(self.crt_path) and os.path.exists(self.key_path)):
            return False
        with open(self.crt_path, "rb") as f:
            cert = x509.load_pem_x509_certificate(f.read())
        if cert.not_valid_after_utc - _now() < datetime.timedelta(days=RENEW_BEFORE_DAYS):
            return False
        try:
            san = cert.extensions.get_extension_for_class(x509.SubjectAlternativeName).value
        except x509.ExtensionNotFound:
            return False
        have_ips = {str(i) for i in san.get_values_for_type(x509.IPAddress)}
        have_names = set(san.get_values_for_type(x509.DNSName))
        return set(ips) <= have_ips and set(names) <= have_names

    def server_context(self, addresses):
        """An SSL context for the given LAN addresses, (re)issuing the certificate if needed."""
        ips = sorted({a for a in addresses if _is_private(a)} | {"127.0.0.1"})
        host = socket.gethostname().lower()
        names = ["localhost"] + ([f"{host}.local"] if host.replace("-", "").isalnum() else [])
        if not self._leaf_ok(ips, names):
            self._issue(ips, names)
        ctx = ssl.SSLContext(ssl.PROTOCOL_TLS_SERVER)
        ctx.minimum_version = ssl.TLSVersion.TLSv1_2
        ctx.load_cert_chain(self.crt_path, self.key_path)
        return ctx

    def _issue(self, ips, names):
        ca_key, ca_cert = self.ca()
        key = ec.generate_private_key(ec.SECP256R1())
        now = _now()
        san = [x509.IPAddress(ipaddress.ip_address(i)) for i in ips] + [x509.DNSName(n) for n in names]
        cert = (
            x509.CertificateBuilder()
            .subject_name(x509.Name([x509.NameAttribute(NameOID.COMMON_NAME, ips[0])]))
            .issuer_name(ca_cert.subject)
            .public_key(key.public_key())
            .serial_number(x509.random_serial_number())
            .not_valid_before(now - datetime.timedelta(days=1))
            .not_valid_after(now + datetime.timedelta(days=LEAF_DAYS))
            .add_extension(x509.SubjectAlternativeName(san), critical=False)
            .add_extension(x509.BasicConstraints(ca=False, path_length=None), critical=True)
            .add_extension(x509.KeyUsage(digital_signature=True, key_cert_sign=False, crl_sign=False,
                                         content_commitment=False, key_encipherment=False, data_encipherment=False,
                                         key_agreement=False, encipher_only=False, decipher_only=False), critical=True)
            .add_extension(x509.ExtendedKeyUsage([ExtendedKeyUsageOID.SERVER_AUTH]), critical=False)
            .add_extension(x509.AuthorityKeyIdentifier.from_issuer_public_key(ca_key.public_key()), critical=False)
            .sign(ca_key, hashes.SHA256())
        )
        _write(self.key_path, key.private_bytes(serialization.Encoding.PEM, serialization.PrivateFormat.PKCS8,
                                                serialization.NoEncryption()), private=True)
        # Serve the chain so clients that trust the CA can build the path.
        _write(self.crt_path, cert.public_bytes(serialization.Encoding.PEM) + ca_cert.public_bytes(serialization.Encoding.PEM))


def _is_private(addr):
    try:
        ip = ipaddress.ip_address(addr)
    except ValueError:
        return False
    return ip.version == 4 and any(ip in ipaddress.ip_network(n) for n in PRIVATE_NETS)
