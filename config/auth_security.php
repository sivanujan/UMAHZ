<?php

return [
    /*
    |--------------------------------------------------------------------------
    | Progressive Login Lockout (per Email + IP)
    |--------------------------------------------------------------------------
    */
    'first_lockout_attempts' => (int) env('AUTH_LOCKOUT_FIRST_ATTEMPTS', 5),
    'first_lockout_minutes' => (int) env('AUTH_LOCKOUT_FIRST_MINUTES', 15),

    'second_lockout_attempts' => (int) env('AUTH_LOCKOUT_SECOND_ATTEMPTS', 5),
    'second_lockout_minutes' => (int) env('AUTH_LOCKOUT_SECOND_MINUTES', 60),

    /*
    |--------------------------------------------------------------------------
    | Distributed Account-Level Lockout (across all IPs)
    |--------------------------------------------------------------------------
    */
    'account_lockout_attempts' => (int) env('AUTH_ACCOUNT_LOCKOUT_ATTEMPTS', 20),
    'account_lockout_window_minutes' => (int) env('AUTH_ACCOUNT_LOCKOUT_WINDOW_MINUTES', 60),
    'account_lockout_minutes' => (int) env('AUTH_ACCOUNT_LOCKOUT_MINUTES', 60),

    /*
    |--------------------------------------------------------------------------
    | Forgot Password Rate Limit
    |--------------------------------------------------------------------------
    */
    'forgot_password_max_attempts' => (int) env('AUTH_FORGOT_PASSWORD_MAX_ATTEMPTS', 5),
];
