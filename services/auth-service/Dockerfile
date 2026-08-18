# ============================================
# IOES - Auth Service Dockerfile
# Java 17 + Spring Boot 3
# ============================================

FROM eclipse-temurin:17-jdk-alpine AS builder

WORKDIR /app

# Copy Maven wrapper and pom.xml
COPY services/auth-service/pom.xml services/auth-service/
COPY services/common-library/pom.xml services/common-library/
RUN mkdir -p services/auth-service/src

# Copy source code
COPY services/auth-service/src services/auth-service/src
COPY services/common-library/src services/common-library/src

# Build the application
WORKDIR /app/services/auth-service
RUN ./mvnw clean package -DskipTests -q \
    || mvn clean package -DskipTests -q

# Runtime stage
FROM eclipse-temurin:17-jre-alpine

WORKDIR /app

# Add non-root user
RUN addgroup -S ioes && adduser -S ioes -G ioes
USER ioes

# Copy the jar file
COPY --from=builder /app/services/auth-service/target/*.jar app.jar

# Expose port
EXPOSE 9000

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=60s --retries=3 \
    CMD wget --no-verbose --tries=1 --spider http://localhost:9000/actuator/health || exit 1

# JVM optimization
ENV JAVA_OPTS="-XX:+UseContainerSupport -XX:MaxRAMPercentage=75.0 -XX:+UseG1GC"

# Run the application
ENTRYPOINT ["sh", "-c", "java $JAVA_OPTS -jar app.jar"]