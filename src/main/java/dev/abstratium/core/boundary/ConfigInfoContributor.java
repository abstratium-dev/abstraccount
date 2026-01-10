package dev.abstratium.core.boundary;

import io.quarkus.info.runtime.spi.InfoContributor;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import org.eclipse.microprofile.config.inject.ConfigProperty;

import java.util.Map;

/**
 * Contributes runtime configuration information to the /info endpoint.
 * This allows exposing selected configuration values through the management interface.
 */
@ApplicationScoped
public class ConfigInfoContributor implements InfoContributor {

    // TODO any config that you want to expose
    // @Inject
    // @ConfigProperty(name = "allow.signup")
    // boolean allowSignup;

    @Inject
    @ConfigProperty(name = "build.version")
    String buildVersion;

    @Override
    public String name() {
        return "config";
    }

    @Override
    public Map<String, Object> data() {
        return Map.of(
            // "allowSignup", allowSignup,
            "buildVersion", buildVersion
        );
    }
}
