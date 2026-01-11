package dev.abstratium.core.boundary;

import io.quarkus.security.Authenticated;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.core.Response;

import java.net.URI;

/**
 * Login endpoint that triggers OIDC authentication flow.
 * 
 * When an unauthenticated user accesses this endpoint:
 * 1. Quarkus OIDC intercepts and redirects to the auth server
 * 2. User authenticates
 * 3. Auth server redirects back to /oauth/callback
 * 4. Quarkus exchanges code for tokens and creates session
 * 5. Quarkus redirects back to this endpoint (with restore-path-after-redirect)
 * 6. This endpoint redirects to the frontend home page
 * 
 * This provides a clean sign-in flow without exposing JSON endpoints to the user.
 */
@Path("/api/auth/login")
@Authenticated
public class LoginResource {

    @GET
    public Response login() {
        // User is now authenticated, redirect to the frontend home page
        return Response.seeOther(URI.create("/")).build();
    }
}
