package dev.abstratium.demo.boundary.api;

import java.util.List;

import org.eclipse.microprofile.openapi.annotations.tags.Tag;

import dev.abstratium.demo.Roles;
import dev.abstratium.demo.entity.Demo;
import dev.abstratium.demo.service.DemoService;
import jakarta.annotation.security.RolesAllowed;
import jakarta.inject.Inject;
import jakarta.ws.rs.DELETE;
import jakarta.ws.rs.GET;
import jakarta.ws.rs.POST;
import jakarta.ws.rs.PUT;
import jakarta.ws.rs.Path;
import jakarta.ws.rs.PathParam;
import jakarta.ws.rs.Produces;
import jakarta.ws.rs.core.MediaType;

@Path("/api/demo")
@Tag(name = "Demo", description = "Demo endpoints")
public class DemoResource {

    @Inject
    DemoService demoService;

    @GET
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed({Roles.USER})
    public List<Demo> getAll() {
        return demoService.findAll();
    }

    @POST
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed({Roles.USER})
    public Demo create(Demo demo) {
        return demoService.create(demo);
    }

    @PUT
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed({Roles.USER})
    public Demo update(Demo demo) {
        return demoService.update(demo);
    }

    @DELETE
    @Path("/{id}")
    @Produces(MediaType.APPLICATION_JSON)
    @RolesAllowed({Roles.USER})
    public void delete(@PathParam("id") String id) {
        demoService.delete(id);
    }

}
