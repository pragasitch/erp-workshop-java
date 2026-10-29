package com.erp.api.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.security.web.SecurityFilterChain;

/**
 * Step 2: health and the OpenAPI docs are public. Everything else stays locked
 * until Step 4 adds the real auth routes and role rules.
 */
@Configuration
public class SecurityConfig {

    @Bean
    public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
        http
                .csrf(csrf -> csrf.disable())
                .authorizeHttpRequests(auth -> auth
                        .requestMatchers("/health", "/openapi/**", "/docs/**", "/swagger-ui/**")
                        .permitAll()
                        .anyRequest().authenticated());
        return http.build();
    }
}
