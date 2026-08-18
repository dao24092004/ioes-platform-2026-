# ============================================
# IOES - API Gateway Dockerfile
# Java 17 + Spring Cloud Gateway WebFlux
# ============================================

FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY services/api-gateway/pom.xml services/api-gateway/
COPY services/common-library/pom.xml services/common-library/
COPY services/common-library/pom.xml services/common-library/
RUN mkdir -p services/api-gateway/src

# Copy source code
COPY services/api-gateway/src services/api-gateway/src
COPY services/common-library/src services/common-library/src

# Build the application
WORKDIR /app/services/api-gateway
RUN ./mvnw clean package -DskipTests -q \
    || mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -S ioes && adduser -S ioes -G ioes
USER ioes

# Copy the jar file
COPY --from=builder /app/services/api-gateway/target/*.jar app.jar

# Expose port
EXPOSE 8080

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:8080/actuator/health || exit 1

# JVM optimization for containers
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC -XX:+ExitOnOutOfMemoryError"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]
