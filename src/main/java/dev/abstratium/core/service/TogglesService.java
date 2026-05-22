package dev.abstratium.core.service;

import com.google.common.cache.Cache;
import com.google.common.cache.CacheBuilder;
import jakarta.annotation.PostConstruct;
import jakarta.annotation.PreDestroy;
import jakarta.enterprise.context.ApplicationScoped;
import jakarta.inject.Inject;
import jakarta.ws.rs.client.Client;
import jakarta.ws.rs.client.ClientBuilder;
import jakarta.ws.rs.core.MediaType;
import jakarta.ws.rs.core.Response;
import org.eclipse.microprofile.config.inject.ConfigProperty;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import com.fasterxml.jackson.databind.ObjectMapper;

import java.nio.charset.StandardCharsets;
import java.time.Duration;
import java.util.Comparator;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.TreeSet;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;
import java.util.regex.PatternSyntaxException;

@ApplicationScoped
public class TogglesService {

    private static final Logger log = LoggerFactory.getLogger(TogglesService.class);
    private static final String TOGGLE_CONTEXT = "abstratium-public";

    @ConfigProperty(name = "abstratium.toggles.api.url")
    String togglesApiUrl;

    @ConfigProperty(name = "abstratium.toggles.cache.ttl-seconds", defaultValue = "30")
    long cacheTtlSeconds;

    @ConfigProperty(name = "abstratium.toggles.cache.max-size-bytes", defaultValue = "5000000")
    long maxCacheSizeBytes;

    @Inject
    StageService stageService;

    @Inject
    ObjectMapper objectMapper;

    private Client client;
    private Cache<String, String> cache;

    public TogglesService() {
    }

    @PostConstruct
    void init() {
        this.client = ClientBuilder.newBuilder()
                .connectTimeout(5, TimeUnit.SECONDS)
                .readTimeout(5, TimeUnit.SECONDS)
                .build();
        this.cache = CacheBuilder.newBuilder()
                .expireAfterWrite(Duration.ofSeconds(cacheTtlSeconds))
                .maximumWeight(maxCacheSizeBytes)
                .weigher((String key, String value) -> value.getBytes(StandardCharsets.UTF_8).length)
                .build();
    }

    @PreDestroy
    void close() {
        if (client != null) {
            client.close();
        }
    }

    public Map<String, String> getToggleValues(Set<String> toggleNames, Map<String, String> clientContext) {
        if (toggleNames == null || toggleNames.isEmpty()) {
            return Map.of();
        }

        ToggleResponse response = fetchToggles(toggleNames);
        Map<String, String> result = new HashMap<>();
        for (String name : toggleNames) {
            result.put(name, evaluateToggle(name, response, clientContext));
        }
        return result;
    }

    private ToggleResponse fetchToggles(Set<String> toggleNames) {
        String cacheKey = buildCacheKey(toggleNames);
        String cachedJson = cache.getIfPresent(cacheKey);
        if (cachedJson != null) {
            try {
                return objectMapper.readValue(cachedJson, ToggleResponse.class);
            } catch (Exception e) {
                log.warn("Failed to deserialize cached toggle response", e);
                cache.invalidate(cacheKey);
            }
        }

        String nameFilter = String.join(",", new TreeSet<>(toggleNames));
        try {
            Response response = client.target(togglesApiUrl)
                    .path("public/toggles")
                    .queryParam("stage", stageService.getStage())
                    .queryParam("context", TOGGLE_CONTEXT)
                    .queryParam("nameFilter", nameFilter)
                    .request(MediaType.APPLICATION_JSON)
                    .get();

            if (response.getStatus() != 200) {
                log.warn("Toggles API returned status {} for nameFilter={}", response.getStatus(), nameFilter);
                return emptyResponse();
            }

            String body = response.readEntity(String.class);
            ToggleResponse toggleResponse = objectMapper.readValue(body, ToggleResponse.class);
            if (toggleResponse == null) {
                return emptyResponse();
            }
            cache.put(cacheKey, body);
            return toggleResponse;
        } catch (Exception e) {
            log.error("Failed to fetch toggles from API", e);
            return emptyResponse();
        }
    }

    private String buildCacheKey(Set<String> toggleNames) {
        return String.join(",", new TreeSet<>(toggleNames));
    }

    private ToggleResponse emptyResponse() {
        return new ToggleResponse(List.of(), new QueryMetadata(0, false));
    }

    private String evaluateToggle(String toggleName, ToggleResponse response, Map<String, String> clientContext) {
        if (response == null || response.toggles() == null) {
            return "off";
        }

        List<ToggleRow> matchingRows = response.toggles().stream()
                .filter(r -> toggleName.equals(r.toggleName()))
                .sorted(Comparator.comparingInt(ToggleRow::priority))
                .toList();

        if (matchingRows.isEmpty()) {
            return "off";
        }

        Map<String, String> context = clientContext != null ? clientContext : Map.of();
        for (ToggleRow row : matchingRows) {
            if (matchesCriteria(row.ruleCriteria(), context)) {
                return row.value();
            }
        }

        return "off";
    }

    private boolean matchesCriteria(List<RuleCriterion> criteria, Map<String, String> clientContext) {
        if (criteria == null || criteria.isEmpty()) {
            return true;
        }
        for (RuleCriterion criterion : criteria) {
            String clientValue = clientContext.getOrDefault(criterion.criterionKey(), "");
            if (!matchesPattern(criterion.criterionValue(), clientValue)) {
                return false;
            }
        }
        return true;
    }

    private boolean matchesPattern(String pattern, String value) {
        if (pattern == null) {
            return false;
        }
        if (pattern.startsWith("/") && pattern.lastIndexOf('/') > 0) {
            int lastSlash = pattern.lastIndexOf('/');
            String regex = pattern.substring(1, lastSlash);
            String flags = pattern.substring(lastSlash + 1);
            int javaFlags = 0;
            for (char c : flags.toCharArray()) {
                switch (c) {
                    case 'i' -> javaFlags |= Pattern.CASE_INSENSITIVE;
                    case 'm' -> javaFlags |= Pattern.MULTILINE;
                    case 's' -> javaFlags |= Pattern.DOTALL;
                    case 'x' -> javaFlags |= Pattern.COMMENTS;
                    case 'u' -> javaFlags |= Pattern.UNICODE_CASE;
                }
            }
            try {
                Pattern p = Pattern.compile(regex, javaFlags);
                return p.matcher(value).matches();
            } catch (PatternSyntaxException e) {
                return pattern.equals(value);
            }
        }
        try {
            Pattern p = Pattern.compile(pattern);
            return p.matcher(value).matches();
        } catch (PatternSyntaxException e) {
            return pattern.equals(value);
        }
    }
}
