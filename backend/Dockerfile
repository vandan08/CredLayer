# ─── Build stage ──────────────────────────────────────────────
FROM maven:3.9-eclipse-temurin-17 AS build
WORKDIR /app

# Cache dependencies first
COPY pom.xml .
RUN mvn -q dependency:go-offline

COPY src ./src
RUN mvn -q package -DskipTests

# ─── Runtime stage ────────────────────────────────────────────
FROM eclipse-temurin:17-jre-alpine
WORKDIR /app

# Run as non-root
RUN addgroup -S credlayer && adduser -S credlayer -G credlayer
USER credlayer

COPY --from=build /app/target/*.jar app.jar

# All configuration is injected via environment variables:
#   CREDLAYER_DB_URL, CREDLAYER_DB_USER, CREDLAYER_DB_PASSWORD
#   CREDLAYER_RPC_URL, CREDLAYER_ORACLE_KEY
#   CREDLAYER_CREDIT_REGISTRY, CREDLAYER_LENDING_POOL
#   CREDLAYER_ALLOWED_ORIGINS, PORT
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "app.jar"]
