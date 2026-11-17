<?php
// backend/install_admin.php
require_once __DIR__ . '/bootstrap.php'; // Подключение к БД

try {
    $pdo = db();
    
    // 1. Генерируем хеши для ВАШИХ демо-паролей
    $adminHash   = password_hash('Demo77', PASSWORD_DEFAULT);
    $managerHash = password_hash('password123', PASSWORD_DEFAULT);
    $userHash    = password_hash('password123', PASSWORD_DEFAULT);
    $ambehterHash = password_hash('newpass123', PASSWORD_DEFAULT);

    // 2. Обновляем записи в БД
    $sql = "UPDATE users SET password_hash = ? WHERE login = ?";
    $stmt = $pdo->prepare($sql);
    
    $stmt->execute([$adminHash, 'Conf2027']);
    $stmt->execute([$managerHash, 'manager01']);
    $stmt->execute([$userHash, 'user01']);
    
    // Обновляем пароль для ambehter (если такого пользователя нет, запрос просто не сработает, и это нормально)
    $stmt->execute([$ambehterHash, 'ambehter']);

    echo "✅ Пароли успешно обновлены! <br>";
    echo "Админ: Conf2027 / Demo77<br>";
    echo "Менеджер: manager01 / password123<br>";
    echo "Пользователь: user01 / password123<br>";
    echo "Пользователь: ambehter / newpass123<br>";
    echo "<br><b>Внимание: Удалите этот файл после использования!</b>";

} catch (Throwable $e) {
    echo "❌ Ошибка: " . $e->getMessage();
}