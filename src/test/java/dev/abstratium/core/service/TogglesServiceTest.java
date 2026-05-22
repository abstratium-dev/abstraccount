package dev.abstratium.core.service;

import com.github.tomakehurst.wiremock.WireMockServer;
import com.github.tomakehurst.wiremock.core.WireMockConfiguration;
import io.quarkus.test.junit.QuarkusTest;
import io.quarkus.test.junit.QuarkusTestProfile;
import io.quarkus.test.junit.TestProfile;
import jakarta.inject.Inject;
import org.junit.jupiter.api.AfterAll;
import org.junit.jupiter.api.BeforeAll;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

import java.util.Map;
import java.util.Set;

import static com.github.tomakehurst.wiremock.client.WireMock.*;
import static org.junit.jupiter.api.Assertions.*;

@QuarkusTest
@TestProfile(TogglesServiceTest.TestProfile.class)
class TogglesServiceTest {

    public static class TestProfile implements QuarkusTestProfile {
        @Override
        public Map<String, String> getConfigOverrides() {
            return Map.of(
                    "abstratium.toggles.api.url", "http://localhost:19999",
                    "abstratium.toggles.cache.ttl-seconds", "60",
                    "abstratium.stage", "test"
            );
        }
    }

    @Inject
    TogglesService togglesService;

    static WireMockServer wireMockServer;

    @BeforeAll
    static void startWireMock() {
        wireMockServer = new WireMockServer(WireMockConfiguration.options().port(19999));
        wireMockServer.start();
    }

    @AfterAll
    static void stopWireMock() {
        wireMockServer.stop();
    }

    @BeforeEach
    void resetWireMock() {
        wireMockServer.resetAll();
    }

    @Test
    void testEmptyToggleNamesReturnsEmptyMap() {
        Map<String, String> result = togglesService.getToggleValues(Set.of(), Map.of());
        assertTrue(result.isEmpty());
    }

    @Test
    void testNullToggleNamesReturnsEmptyMap() {
        Map<String, String> result = togglesService.getToggleValues(null, Map.of());
        assertTrue(result.isEmpty());
    }

    @Test
    void testCatchAllRuleReturnsValue() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-catchall",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-catchall"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-catchall"), Map.of());

        assertEquals("enabled", result.get("test-catchall"));
    }

    @Test
    void testMissingToggleReturnsOff() {
        String responseJson = """
                {
                    "toggles": [],
                    "queryMetadata": {
                        "count": 0,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-missing"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-missing"), Map.of());

        assertEquals("off", result.get("test-missing"));
    }

    @Test
    void testApiErrorReturnsOff() {
        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-error"))
                .willReturn(aResponse().withStatus(500)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-error"), Map.of());

        assertEquals("off", result.get("test-error"));
    }

    @Test
    void testRuleCriteriaRegexMatching() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-regex",
                            "stageName": "test",
                            "ruleName": "specific",
                            "priority": 1,
                            "value": "special",
                            "ruleCriteria": [
                                { "criterionKey": "userId", "criterionValue": "admin" }
                            ]
                        },
                        {
                            "toggleName": "test-regex",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 2,
                            "value": "off",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 2,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-regex"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> matchResult = togglesService.getToggleValues(
                Set.of("test-regex"), Map.of("userId", "admin"));
        assertEquals("special", matchResult.get("test-regex"));

        Map<String, String> noMatchResult = togglesService.getToggleValues(
                Set.of("test-regex"), Map.of("userId", "user1"));
        assertEquals("off", noMatchResult.get("test-regex"));
    }

    @Test
    void testRuleCriteriaMissingKeyUsesEmptyString() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-missing-key",
                            "stageName": "test",
                            "ruleName": "specific",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": [
                                { "criterionKey": "userId", "criterionValue": "" }
                            ]
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-missing-key"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-missing-key"), Map.of());

        assertEquals("enabled", result.get("test-missing-key"));
    }

    @Test
    void testSlashDelimitedRegexWithFlags() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-regex-flags",
                            "stageName": "test",
                            "ruleName": "region",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": [
                                { "criterionKey": "country", "criterionValue": "/^DE$/i" }
                            ]
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-regex-flags"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-regex-flags"), Map.of("country", "de"));

        assertEquals("enabled", result.get("test-regex-flags"));
    }

    @Test
    void testInvalidRegexFallsBackToExactMatch() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-invalid-regex",
                            "stageName": "test",
                            "ruleName": "bad",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": [
                                { "criterionKey": "mode", "criterionValue": "[invalid" }
                            ]
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-invalid-regex"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> exactMatchResult = togglesService.getToggleValues(
                Set.of("test-invalid-regex"), Map.of("mode", "[invalid"));
        assertEquals("enabled", exactMatchResult.get("test-invalid-regex"));

        Map<String, String> noMatchResult = togglesService.getToggleValues(
                Set.of("test-invalid-regex"), Map.of("mode", "other"));
        assertEquals("off", noMatchResult.get("test-invalid-regex"));
    }

    @Test
    void testNoRuleMatchesReturnsOff() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-no-match",
                            "stageName": "test",
                            "ruleName": "specific",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": [
                                { "criterionKey": "userId", "criterionValue": "admin" }
                            ]
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-no-match"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-no-match"), Map.of("userId", "user1"));

        assertEquals("off", result.get("test-no-match"));
    }

    @Test
    void testMultipleTogglesInOneRequest() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "toggle-a",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "on",
                            "ruleCriteria": []
                        },
                        {
                            "toggleName": "toggle-b",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "off",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 2,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("toggle-a,toggle-b"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("toggle-a", "toggle-b"), Map.of());

        assertEquals("on", result.get("toggle-a"));
        assertEquals("off", result.get("toggle-b"));
    }

    @Test
    void testResponseIsCached() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-cached",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "cached-value",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-cached"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> firstResult = togglesService.getToggleValues(
                Set.of("test-cached"), Map.of());
        assertEquals("cached-value", firstResult.get("test-cached"));

        Map<String, String> secondResult = togglesService.getToggleValues(
                Set.of("test-cached"), Map.of());
        assertEquals("cached-value", secondResult.get("test-cached"));

        wireMockServer.verify(1, getRequestedFor(urlPathEqualTo("/public/toggles"))
                .withQueryParam("nameFilter", equalTo("test-cached")));
    }

    @Test
    void testNullClientContextTreatedAsEmpty() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-null-context",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-null-context"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-null-context"), null);

        assertEquals("enabled", result.get("test-null-context"));
    }

    @Test
    void testPrioritySorting() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-priority",
                            "stageName": "test",
                            "ruleName": "low",
                            "priority": 3,
                            "value": "low-priority",
                            "ruleCriteria": []
                        },
                        {
                            "toggleName": "test-priority",
                            "stageName": "test",
                            "ruleName": "high",
                            "priority": 1,
                            "value": "high-priority",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 2,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-priority"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-priority"), Map.of());

        assertEquals("high-priority", result.get("test-priority"));
    }

    @Test
    void testNullCriterionValueDoesNotMatch() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "test-null-criterion",
                            "stageName": "test",
                            "ruleName": "specific",
                            "priority": 1,
                            "value": "enabled",
                            "ruleCriteria": [
                                { "criterionKey": "userId", "criterionValue": null }
                            ]
                        }
                    ],
                    "queryMetadata": {
                        "count": 1,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-null-criterion"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-null-criterion"), Map.of("userId", "admin"));

        assertEquals("off", result.get("test-null-criterion"));
    }

    @Test
    void testMalformedJsonReturnsOff() {
        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("test-malformed"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody("{ invalid json ")));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("test-malformed"), Map.of());

        assertEquals("off", result.get("test-malformed"));
    }

    @Test
    void testMixedToggleNamesFiltersCorrectly() {
        String responseJson = """
                {
                    "toggles": [
                        {
                            "toggleName": "wanted-toggle",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "on",
                            "ruleCriteria": []
                        },
                        {
                            "toggleName": "other-toggle",
                            "stageName": "test",
                            "ruleName": "default",
                            "priority": 1,
                            "value": "off",
                            "ruleCriteria": []
                        }
                    ],
                    "queryMetadata": {
                        "count": 2,
                        "cacheHit": false
                    }
                }
                """;

        wireMockServer.stubFor(get(urlPathEqualTo("/public/toggles"))
                .withQueryParam("stage", equalTo("test"))
                .withQueryParam("context", equalTo("abstratium-public"))
                .withQueryParam("nameFilter", equalTo("wanted-toggle"))
                .willReturn(aResponse()
                        .withStatus(200)
                        .withHeader("Content-Type", "application/json")
                        .withBody(responseJson)));

        Map<String, String> result = togglesService.getToggleValues(
                Set.of("wanted-toggle"), Map.of());

        assertEquals("on", result.get("wanted-toggle"));
    }
}
