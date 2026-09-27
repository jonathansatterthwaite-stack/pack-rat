package com.packrat.app;

import android.content.Context;

import java.io.File;
import java.io.IOException;

/** One PartyServer per app process, shared by the activity and the hosting service. */
public final class PackRat {
    private static PartyServer server;

    private PackRat() {}

    public static synchronized PartyServer server(Context context) throws IOException {
        if (server == null) {
            Context app = context.getApplicationContext();
            PartyServer s = new PartyServer(app.getAssets(), new File(app.getFilesDir(), "party-data"));
            s.startApp();
            server = s;
        }
        return server;
    }

    /** The server if it's already running (e.g. from the service's Stop button). */
    public static synchronized PartyServer existing() {
        return server;
    }
}
