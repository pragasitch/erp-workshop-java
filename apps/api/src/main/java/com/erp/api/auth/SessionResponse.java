package com.erp.api.auth;

import com.erp.api.user.UserDto;

/** The signed-in user, or null. Mirrors the old SessionSchema `{ user: User | null }`. */
public record SessionResponse(UserDto user) {}
