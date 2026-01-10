package dev.abstratium.demo.boundary.publik;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import io.quarkus.runtime.annotations.RegisterForReflection;
import jakarta.annotation.security.PermitAll;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

/** the public API */
@Path("/public/api")
@Tag(name = "API", description = "Public API endpoints")
@PermitAll
public class PublicDemoResource {

    @GET
    @Path("/hello")
    @Produces(MediaType.APPLICATION_JSON)
    public List<SuccessResponse> demo() {
        return List.of(new SuccessResponse("Demo public endpoint works!"));
    }

    @RegisterForReflection
    public static class SuccessResponse {
        public String message;
        
        public SuccessResponse(String message) {
            this.message = message;
        }
    }
}
