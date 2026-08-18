# ============================================
# IOES - Discovery Service Dockerfile
# Java 17 + Spring Cloud Netflix Eureka
# ============================================

FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY services/discovery-service/pom.xml services/discovery-service/
RUN mkdir -p services/discovery-service/src

# Copy source code
COPY services/discovery-service/src services/discovery-service/src

# Build the application
WORKDIR /app/services/discovery-service
RUN ./mvnw clean package -DskipTests -q \
    || mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -S ioes && adduser -S ioes -G ioes
USER ioes

# Copy the jar file
COPY --from=builder /app/services/discovery-service/target/*.jar app.jar

# Expose port
EXPOSE 9999

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9999/actuator/health || exit 1

# JVM optimization
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]