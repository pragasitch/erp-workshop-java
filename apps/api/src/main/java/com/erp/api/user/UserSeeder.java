package com.erp.api.user;

import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/**
 * Demo accounts for the workshop (also shown on the login page). Re-running
 * resets their name, role and password. Replaces the old Prisma seed.ts.
 */
@Component
public class UserSeeder implements CommandLineRunner {

    private static final String DEMO_PASSWORD = "password";

    private final UserRepository users;
    private final PasswordEncoder passwordEncoder;

    public UserSeeder(UserRepository users, PasswordEncoder passwordEncoder) {
        this.users = users;
        this.passwordEncoder = passwordEncoder;
    }

    private record DemoUser(String email, String name, Role role) {}

    @Override
    public void run(String... args) {
        var demoUsers = new DemoUser[] {
            new DemoUser("admin@erp.local", "Admin User", Role.ADMIN),
            new DemoUser("staff@erp.local", "Staff User", Role.STAFF),
        };
        String passwordHash = passwordEncoder.encode(DEMO_PASSWORD);
        for (DemoUser demo : demoUsers) {
            User user = users.findByEmail(demo.email()).orElseGet(User::new);
            user.setEmail(demo.email());
            user.setName(demo.name());
            user.setRole(demo.role());
            user.setPasswordHash(passwordHash);
            users.save(user);
        }
        System.out.printf("Seeded %d demo users (password: \"%s\").%n", demoUsers.length, DEMO_PASSWORD);
    }
}
