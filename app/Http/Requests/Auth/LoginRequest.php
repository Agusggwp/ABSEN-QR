<?php

namespace App\Http\Requests\Auth;

use Illuminate\Auth\Events\Lockout;
use Illuminate\Contracts\Validation\ValidationRule;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Support\Facades\Auth;
use Illuminate\Support\Facades\RateLimiter;
use Illuminate\Support\Str;
use Illuminate\Validation\ValidationException;

class LoginRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return true;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'login' => ['sometimes', 'string'],
            'email' => ['sometimes', 'string'],
            'password' => ['required', 'string'],
        ];
    }

    /**
     * Attempt to authenticate the request's credentials.
     *
     * @throws ValidationException
     */
    public function authenticate(): void
    {
        $this->ensureIsNotRateLimited();

        $loginInput = $this->input('login') ?? $this->input('email');
        if (!$loginInput) {
            throw ValidationException::withMessages([
                'email' => 'Email atau NIS / Username wajib diisi.',
            ]);
        }

        $fieldType = filter_var($loginInput, FILTER_VALIDATE_EMAIL) ? 'email' : 'username';

        $user = \App\Models\User::where($fieldType, $loginInput)->first();

        if (!$user && $fieldType === 'username') {
            $user = \App\Models\User::where('email', $loginInput . '@student.artdevata.sch.id')->first();
            if ($user) {
                $fieldType = 'email';
                $loginInput = $user->email;
            }
        }

        if (!$user || !Auth::attempt([$fieldType => $loginInput, 'password' => $this->input('password')], $this->boolean('remember'))) {
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => 'Kredensial yang diberikan tidak cocok dengan data kami.',
            ]);
        }

        if (!$user->is_active) {
            Auth::logout();
            RateLimiter::hit($this->throttleKey());

            throw ValidationException::withMessages([
                'email' => 'Akun Anda sedang dinonaktifkan. Silakan hubungi pihak sekolah.',
            ]);
        }

        RateLimiter::clear($this->throttleKey());
    }

    /**
     * Ensure the login request is not rate limited.
     *
     * @throws ValidationException
     */
    public function ensureIsNotRateLimited(): void
    {
        if (! RateLimiter::tooManyAttempts($this->throttleKey(), 5)) {
            return;
        }

        event(new Lockout($this));

        $seconds = RateLimiter::availableIn($this->throttleKey());

        throw ValidationException::withMessages([
            'email' => trans('auth.throttle', [
                'seconds' => $seconds,
                'minutes' => ceil($seconds / 60),
            ]),
        ]);
    }

    /**
     * Get the rate limiting throttle key for the request.
     */
    public function throttleKey(): string
    {
        $loginInput = $this->input('login') ?? $this->input('email') ?? '';
        return Str::transliterate(Str::lower($loginInput).'|'.$this->ip());
    }
}
