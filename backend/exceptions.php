<?php
declare(strict_types=1);

class AuthException extends Exception {}
class ForbiddenException extends Exception {}
class NotFoundException extends Exception {}
class ConflictException extends Exception {}
class ValidationException extends Exception {}