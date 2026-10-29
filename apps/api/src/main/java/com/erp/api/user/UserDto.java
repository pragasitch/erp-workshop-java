package com.erp.api.user;

import io.swagger.v3.oas.annotations.media.Schema;

/** The signed-in user as the API exposes it. Never includes the password hash. */
public record UserDto(
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String id,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String email,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) String name,
        @Schema(requiredMode = Schema.RequiredMode.REQUIRED) Role role) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}
