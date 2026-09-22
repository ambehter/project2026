<?php
declare(strict_types=1);

function currentUser(): ?array
{
    bootstrapSession();
    return $_SESSION['user'] ?? null;
}

function authenticate(): array
{
    $u = currentUser();
    if (!$u) {
        throw new AuthException('Unauthorized');
    }
    return $u;
}

function requireRole(string ...$roles): array
{
    $u = authenticate();
    if (!in_array($u['role'] ?? '', $roles, true)) {
        throw new ForbiddenException('Forbidden');
    }
    return $u;
}

function requireManager(): array
{
    // п.3.4: admin допускается к функциям менеджера
    return requireRole('manager', 'admin');
}

/** Возвращает id ресторана, принадлежащего менеджеру. */
function managerRestaurantId(int $managerId): ?int
{
    $stmt = db()->prepare('SELECT id FROM restaurants WHERE manager_id = ? LIMIT 1');
    $stmt->execute([$managerId]);
    $id = $stmt->fetchColumn();
    return $id ? (int)$id : null;
}