package com.erp.api.user;

/** The signed-in user as the API exposes it. Never includes the password hash. */
public record UserDto(String id, String email, String name, Role role) {
    public static UserDto from(User user) {
        return new UserDto(user.getId(), user.getEmail(), user.getName(), user.getRole());
    }
}
