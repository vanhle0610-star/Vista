FROM gradle:9.8.1-jdk21-alpine AS build
WORKDIR /workspace
COPY . .
RUN ./gradlew clean bootJar --no-daemon

FROM eclipse-temurin:21-jre-alpine
RUN addgroup -S vista && adduser -S vista -G vista
WORKDIR /app
COPY --from=build /workspace/build/libs/*.jar app.jar
USER vista
EXPOSE 8080
ENTRYPOINT ["java", "-XX:MaxRAMPercentage=75", "-jar", "/app/app.jar"]
