# Custom OpenTelemetry Instrumentation Examples

This document provides examples of how to add custom instrumentation to your code for enhanced observability.

## Automatic Instrumentation

Quarkus OpenTelemetry automatically instruments:
- HTTP requests (REST endpoints)
- JDBC database queries
- REST client calls
- Reactive messaging (Kafka)

No code changes needed for these!

## Adding Custom Spans

For business logic or operations you want to trace separately, you can add custom spans.

### Using @WithSpan Annotation

The simplest way to create a custom span:

```java
import io.opentelemetry.instrumentation.annotations.WithSpan;
import io.opentelemetry.instrumentation.annotations.SpanAttribute;

@ApplicationScoped
public class DemoService {
    
    @WithSpan("process_demo")  // Creates a span named "process_demo"
    public void processDemo(@SpanAttribute("demo.id") Long demoId) {
        // Your business logic here
        // The span will automatically capture:
        // - Method execution time
        // - Any exceptions thrown
        // - The demo.id attribute
    }
    
    @WithSpan  // Uses method name as span name
    public Demo calculateComplexOperation(
        @SpanAttribute("input.value") String input
    ) {
        // Complex calculation
        return result;
    }
}
```

### Manual Span Creation

For more control, inject the `Tracer`:

```java
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;
import jakarta.inject.Inject;

@ApplicationScoped
public class DemoService {
    
    @Inject
    Tracer tracer;
    
    public void complexOperation(Long demoId) {
        Span span = tracer.spanBuilder("complex_operation")
            .setAttribute("demo.id", demoId)
            .startSpan();
        
        try {
            // Your business logic
            performStep1();
            performStep2();
            
            // Add more attributes as you go
            span.setAttribute("steps.completed", 2);
            
        } catch (Exception e) {
            // Record the exception in the span
            span.recordException(e);
            span.setStatus(StatusCode.ERROR, "Operation failed");
            throw e;
        } finally {
            span.end();  // Always end the span
        }
    }
}
```

### Creating Child Spans

To create nested spans for sub-operations:

```java
import io.opentelemetry.api.trace.Tracer;
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.context.Scope;
import jakarta.inject.Inject;

@ApplicationScoped
public class DemoService {
    
    @Inject
    Tracer tracer;
    
    public void parentOperation() {
        Span parentSpan = tracer.spanBuilder("parent_operation")
            .startSpan();
        
        try (Scope scope = parentSpan.makeCurrent()) {
            // Child spans will automatically be linked to parentSpan
            childOperation1();
            childOperation2();
        } finally {
            parentSpan.end();
        }
    }
    
    private void childOperation1() {
        Span childSpan = tracer.spanBuilder("child_operation_1")
            .startSpan();
        try {
            // Do work
        } finally {
            childSpan.end();
        }
    }
    
    private void childOperation2() {
        Span childSpan = tracer.spanBuilder("child_operation_2")
            .startSpan();
        try {
            // Do work
        } finally {
            childSpan.end();
        }
    }
}
```

## Adding Custom Attributes to Spans

### Adding Attributes to Current Span

```java
import io.opentelemetry.api.trace.Span;

public void someMethod() {
    Span currentSpan = Span.current();
    
    // Add various types of attributes
    currentSpan.setAttribute("user.id", userId);
    currentSpan.setAttribute("operation.type", "create");
    currentSpan.setAttribute("items.count", itemList.size());
    currentSpan.setAttribute("is.premium", isPremiumUser);
}
```

### Adding Business Context

```java
@Path("/api/demo")
public class DemoResource {
    
    @POST
    public Response createDemo(DemoRequest request) {
        Span currentSpan = Span.current();
        
        // Add business context to the HTTP request span
        currentSpan.setAttribute("demo.name", request.getName());
        currentSpan.setAttribute("demo.category", request.getCategory());
        currentSpan.setAttribute("user.role", securityContext.getUserRole());
        
        // Your logic
        Demo demo = demoService.create(request);
        
        currentSpan.setAttribute("demo.id", demo.getId());
        return Response.ok(demo).build();
    }
}
```

## Adding Events to Spans

Events are timestamped annotations within a span:

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.common.Attributes;

public void processOrder(Order order) {
    Span span = Span.current();
    
    // Add events to mark important moments
    span.addEvent("order.validated");
    
    validateOrder(order);
    
    span.addEvent("payment.started", 
        Attributes.builder()
            .put("payment.method", order.getPaymentMethod())
            .put("payment.amount", order.getTotal())
            .build()
    );
    
    processPayment(order);
    
    span.addEvent("order.completed");
}
```

## Enriching Logs with Trace Context

Logs are automatically enriched with `traceId` and `spanId`. To add more context:

```java
import org.jboss.logging.Logger;
import io.opentelemetry.api.trace.Span;

@ApplicationScoped
public class DemoService {
    
    private static final Logger LOG = Logger.getLogger(DemoService.class);
    
    public void processDemo(Long demoId) {
        Span span = Span.current();
        
        // Log messages will automatically include traceId and spanId
        LOG.info("Processing demo: " + demoId);
        
        try {
            // Your logic
            Demo demo = repository.findById(demoId);
            LOG.debug("Found demo: " + demo.getName());
            
        } catch (Exception e) {
            // Error logs will be correlated with the error span
            LOG.error("Failed to process demo: " + demoId, e);
            span.recordException(e);
            throw e;
        }
    }
}
```

## Handling Errors and Exceptions

### Recording Exceptions

```java
import io.opentelemetry.api.trace.Span;
import io.opentelemetry.api.trace.StatusCode;

public void riskyOperation() {
    Span span = Span.current();
    
    try {
        // Risky operation
        performDatabaseOperation();
        
    } catch (DatabaseException e) {
        // Record the exception with full stack trace
        span.recordException(e);
        
        // Set span status to ERROR
        span.setStatus(StatusCode.ERROR, "Database operation failed");
        
        // Add context about the error
        span.setAttribute("error.type", "database");
        span.setAttribute("error.recoverable", false);
        
        throw e;
    }
}
```

### Conditional Error Recording

```java
public void operationWithRetry() {
    Span span = Span.current();
    int attempts = 0;
    
    while (attempts < 3) {
        try {
            performOperation();
            span.setAttribute("retry.attempts", attempts);
            return;
            
        } catch (TransientException e) {
            attempts++;
            
            if (attempts < 3) {
                // Don't mark as error yet, just add an event
                span.addEvent("retry.attempt", 
                    Attributes.builder()
                        .put("attempt.number", attempts)
                        .put("error.message", e.getMessage())
                        .build()
                );
            } else {
                // Final attempt failed, mark as error
                span.recordException(e);
                span.setStatus(StatusCode.ERROR, "All retry attempts failed");
                throw e;
            }
        }
    }
}
```

## Async Operations

For async operations, propagate the trace context:

```java
import io.opentelemetry.context.Context;
import java.util.concurrent.CompletableFuture;

@ApplicationScoped
public class AsyncService {
    
    @Inject
    Tracer tracer;
    
    @Inject
    @ManagedExecutor
    ManagedExecutor executor;
    
    public CompletableFuture<Result> asyncOperation() {
        // Capture current context
        Context context = Context.current();
        
        return CompletableFuture.supplyAsync(() -> {
            // Restore context in async thread
            try (Scope scope = context.makeCurrent()) {
                Span span = tracer.spanBuilder("async_operation")
                    .startSpan();
                try {
                    // Your async work
                    return performWork();
                } finally {
                    span.end();
                }
            }
        }, executor);
    }
}
```

## Best Practices

### 1. Span Naming
- Use descriptive, consistent names: `process_order`, `validate_payment`
- Use lowercase with underscores
- Include the operation type: `db.query`, `http.request`, `cache.get`

### 2. Attributes
- Add meaningful business context
- Use consistent attribute names across the application
- Avoid sensitive data (passwords, tokens, PII)
- Use semantic conventions when possible: https://opentelemetry.io/docs/specs/semconv/

### 3. Error Handling
- Always record exceptions in spans
- Set appropriate status codes
- Add context about error recoverability
- Don't swallow exceptions after recording

### 4. Performance
- Don't create too many spans (avoid spans for trivial operations)
- Use sampling in production
- Be mindful of attribute cardinality (don't use unique IDs as attribute keys)

### 5. Resource Management
- Always end spans (use try-finally or try-with-resources)
- Don't leak spans (ensure they're ended even on errors)
- Use `@WithSpan` when possible (automatic cleanup)

## Common Patterns

### Database Operation Pattern

```java
@WithSpan("db.find_demo")
public Demo findDemo(@SpanAttribute("demo.id") Long id) {
    Span span = Span.current();
    span.setAttribute("db.operation", "select");
    span.setAttribute("db.table", "demo");
    
    try {
        Demo demo = entityManager.find(Demo.class, id);
        span.setAttribute("db.found", demo != null);
        return demo;
    } catch (Exception e) {
        span.recordException(e);
        span.setStatus(StatusCode.ERROR, "Database query failed");
        throw e;
    }
}
```

### External API Call Pattern

```java
@WithSpan("external.api_call")
public ApiResponse callExternalApi(@SpanAttribute("api.endpoint") String endpoint) {
    Span span = Span.current();
    span.setAttribute("http.method", "POST");
    span.setAttribute("http.url", endpoint);
    
    try {
        ApiResponse response = restClient.post(endpoint, payload);
        span.setAttribute("http.status_code", response.getStatusCode());
        span.setAttribute("api.response_time_ms", response.getDuration());
        return response;
    } catch (Exception e) {
        span.recordException(e);
        span.setStatus(StatusCode.ERROR, "External API call failed");
        throw e;
    }
}
```

### Batch Processing Pattern

```java
public void processBatch(List<Item> items) {
    Span batchSpan = tracer.spanBuilder("process_batch")
        .setAttribute("batch.size", items.size())
        .startSpan();
    
    try (Scope scope = batchSpan.makeCurrent()) {
        int processed = 0;
        int failed = 0;
        
        for (Item item : items) {
            Span itemSpan = tracer.spanBuilder("process_item")
                .setAttribute("item.id", item.getId())
                .startSpan();
            
            try {
                processItem(item);
                processed++;
            } catch (Exception e) {
                failed++;
                itemSpan.recordException(e);
                itemSpan.setStatus(StatusCode.ERROR);
            } finally {
                itemSpan.end();
            }
        }
        
        batchSpan.setAttribute("batch.processed", processed);
        batchSpan.setAttribute("batch.failed", failed);
        
        if (failed > 0) {
            batchSpan.setStatus(StatusCode.ERROR, 
                String.format("%d items failed", failed));
        }
        
    } finally {
        batchSpan.end();
    }
}
```

## Testing Custom Instrumentation

In tests, OpenTelemetry is disabled by default (`%test.quarkus.otel.sdk.disabled=true`).

To test instrumentation:

```java
@QuarkusTest
public class InstrumentationTest {
    
    @Inject
    Tracer tracer;
    
    @Test
    public void testCustomSpan() {
        // OpenTelemetry is disabled in tests
        // But you can still verify your code doesn't break
        Span span = tracer.spanBuilder("test_span").startSpan();
        try {
            span.setAttribute("test.attribute", "value");
            // Your logic
        } finally {
            span.end();
        }
    }
}
```

## References

- [OpenTelemetry Java API](https://opentelemetry.io/docs/instrumentation/java/manual/)
- [OpenTelemetry Semantic Conventions](https://opentelemetry.io/docs/specs/semconv/)
- [Quarkus OpenTelemetry Guide](https://quarkus.io/guides/opentelemetry-tracing)
