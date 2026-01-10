package dev.abstratium.core.boundary;

import io.quarkus.oidc.IdToken;
import io.quarkus.security.Authenticated;
import jakarta.inject.Inject;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.Context;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.container.ContainerRequestContext;
import org.eclipse.microprofile.jwt.JsonWebToken;

import java.util.HashMap;
import java.util.Map;

/**
 * Provides user information from OIDC ID token to the Angular frontend.
 * 
 * This endpoint is part of the BFF (Backend For Frontend) pattern where:
 * - Quarkus acts as OIDC client to itself
 * - JWT tokens are stored in HTTP-only cookies (never exposed to JavaScript)
 * - Angular fetches user info (JWT payload without signature) from this endpoint
 * 
 * Security: Returns JWT payload (claims) without the signature, which is safe
 * to expose to the SPA. The actual JWT remains in HTTP-only cookies.
 */
@Path("/api/core/userinfo")
@Authenticated
public class UserInfoResource {

    @Inject
    @IdToken
    JsonWebToken idToken;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    public Map<String, Object> getUserInfo(@Context ContainerRequestContext requestContext) {
        Map<String, Object> userInfo = new HashMap<>();
        
        String email = idToken.getClaim("email");
        String clientId = idToken.getAudience() != null && !idToken.getAudience().isEmpty() 
            ? idToken.getAudience().iterator().next() : null;

        userInfo.put("iss", idToken.getIssuer());
        userInfo.put("sub", idToken.getSubject());
        userInfo.put("email", email);
        userInfo.put("email_verified", idToken.getClaim("email_verified"));
        userInfo.put("name", idToken.getClaim("name"));  // Use claim directly, not getName()
        userInfo.put("groups", idToken.getGroups());
        userInfo.put("iat", idToken.getIssuedAtTime());
        userInfo.put("exp", idToken.getExpirationTime());
        userInfo.put("client_id", clientId);
        userInfo.put("jti", idToken.getClaim("jti"));
        userInfo.put("upn", idToken.getName());  // getName() returns upn claim
        userInfo.put("auth_method", idToken.getClaim("auth_method"));
        userInfo.put("isAuthenticated", true);
        
        return userInfo;
    }
}
