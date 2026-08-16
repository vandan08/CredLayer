package com.credlayer.backend.config;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.context.annotation.Configuration;
import org.springframework.lang.NonNull;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

/**
 * Global CORS policy. Origins are configured via
 * {@code credlayer.security.allowed-origins} (comma-separated) so production
 * deployments can restrict access to the real frontend domain instead of the
 * wildcard {@code *} that was previously hardcoded on the controller.
 */
@Configuration
public class CorsConfig implements WebMvcConfigurer {

    @Value("${credlayer.security.allowed-origins:http://localhost:3000}")
    private String[] allowedOrigins;

    @Override
    public void addCorsMappings(@NonNull CorsRegistry registry) {
        registry.addMapping("/api/**")
                .allowedOrigins(allowedOrigins)
                .allowedMethods("GET", "POST")
                .allowedHeaders("Content-Type")
                .maxAge(3600);
    }
}
