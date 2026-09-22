<?php
declare(strict_types=1);

/**
 * Простой роутер: массив [method, pattern, [Class, method]].
 * pattern: /api/restaurant/{id} — {id} и {slug} заменяются на regex.
 */
function route_dispatch(string $method, string $path): void
{
    $routes = [
        // auth
        ['POST', '/api/auth/register',        ['AuthController',       'register']],
        ['POST', '/api/auth/login',           ['AuthController',       'login']],
        ['POST', '/api/auth/logout',          ['AuthController',       'logout']],
        ['GET',  '/api/auth/me',              ['AuthController',       'me']],

        // restaurants
        ['GET',  '/api/restaurants',          ['RestaurantController', 'list']],
        ['GET',  '/api/restaurant/{id}',      ['RestaurantController', 'show']],

        // tables
        ['GET',  '/api/tables/availability',  ['TableController',      'availability']],

        // bookings
        ['POST', '/api/bookings',             ['BookingController',    'create']],
        ['GET',  '/api/bookings/me',          ['BookingController',    'my']],
        ['PUT',  '/api/bookings/cancel/{id}', ['BookingController',    'cancel']],

        // manager
        ['GET',  '/api/manager/bookings',        ['ManagerController', 'bookings']],
        ['PUT',  '/api/manager/booking/{id}',    ['ManagerController', 'updateBooking']],
        ['GET',  '/api/manager/halls',           ['ManagerController', 'halls']],
        ['POST', '/api/manager/halls',           ['ManagerController', 'createHall']],
        ['GET',  '/api/manager/tables',          ['ManagerController', 'tables']],
        ['POST', '/api/manager/tables',          ['ManagerController', 'createTable']],

        // user
        ['PUT',  '/api/user/profile',         ['UserController',       'updateProfile']],
        ['PUT',  '/api/user/password',        ['UserController',       'updatePassword']],
    ];

    foreach ($routes as [$m, $pattern, $handler]) {
        if ($m !== $method) {
            continue;
        }
        $regex = '#^' . preg_replace('#\{[a-zA-Z_]+\}#', '([^/]+)', $pattern) . '$#';
        if (preg_match($regex, $path, $matches)) {
            array_shift($matches);
            [$class, $fn] = $handler;
            require_once __DIR__ . '/controllers/' . $class . '.php';
            call_user_func_array([$class, $fn], array_map('urldecode', $matches));
            return;
        }
    }

    jsonError('Endpoint not found', 404);
}