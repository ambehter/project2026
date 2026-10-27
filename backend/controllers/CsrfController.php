<?php
declare(strict_types=1);

class CsrfController
{
    /**
     * GET /api/csrf-token
     * Возвращает токен для текущей сессии.
     * Если сессии нет — создаёт её.
     */
    public static function getToken(): void
    {
        $token = generateCsrfToken();
        jsonOk(['csrf_token' => $token]);
    }
}