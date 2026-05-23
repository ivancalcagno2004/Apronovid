<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Str;

class AuthController extends Controller
{
    public function register(Request $request)
    {
        $validated = $request->validate([
            'name' => 'required|string|max:255',
            'email' => 'required|string|email|max:255|unique:users',
            'password' => 'required|string|min:8',
            'role' => 'required|in:oyente,narrador',
        ]);

        $user = User::create([
            'name' => $validated['name'],
            'email' => $validated['email'],
            'password' => Hash::make($validated['password']),
            'role' => $validated['role'],
        ]);

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ], 201);
    }

    public function login(Request $request)
    {
        $request->validate([
            'email' => 'required|email',
            'password' => 'required',
        ]);

        $user = User::where('email', $request->email)->first();

        if (! $user || ! Hash::check($request->password, $user->password)) {
            return response()->json([
                'message' => 'Las credenciales proporcionadas son incorrectas.'
            ], 401);
        }

        $token = $user->createToken('auth_token')->plainTextToken;

        return response()->json([
            'user' => $user,
            'token' => $token,
        ]);
    }

    public function logout(Request $request)
    {
        // Elimina el token actual que usó el usuario para hacer esta petición
        $request->user()->currentAccessToken()->delete();

        return response()->json(['message' => 'Sesión cerrada correctamente'], 200);
    }

    public function updateEmail(Request $request)
    {
        $request->validate([
            'email' => 'required|email|unique:users,email,' . $request->user()->id,
        ]);

        $user = $request->user();
        $user->email = $request->email;
        $user->save();

        return response()->json(['message' => 'Email actualizado con éxito', 'user' => $user]);
    }

    public function updatePassword(Request $request)
    {
        $request->validate([
            'current_password' => 'required',
            'new_password' => 'required|min:6',
        ]);

        $user = $request->user();

        // Verificamos que la contraseña actual sea correcta
        if (!Hash::check($request->current_password, $user->password)) {
            return response()->json(['message' => 'La contraseña actual es incorrecta'], 400);
        }

        $user->password = Hash::make($request->new_password);
        $user->save();

        return response()->json(['message' => 'Contraseña actualizada con éxito']);
    }

    public function googleAuth(Request $request)
    {
        // Validamos que el frontend nos mande los datos mínimos de Google
        $request->validate([
            'email' => 'required|email',
            'name' => 'required|string',
            // El rol solo será obligatorio si estamos creando una cuenta nueva
            'role' => 'sometimes|in:oyente,narrador',
        ]);

        // Buscamos si el usuario ya existe
        $user = User::where('email', $request->email)->first();

        if ($user) {
            // ESCENARIO A: El usuario ya existía (Hizo Login)
            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Login exitoso',
                'user' => $user,
                'token' => $token,
            ], 200);
        } else {
            // ESCENARIO B: El usuario no existe (Hizo Registro)
            // Validamos estrictamente que haya mandado un rol
            if (!$request->has('role')) {
                return response()->json(['message' => 'Falta especificar el rol para el registro'], 422);
            }

            $user = User::create([
                'name' => $request->name,
                'email' => $request->email,
                'password' => Hash::make(Str::random(24)), // Contraseña imposible de adivinar
                'role' => $request->role, // Guardamos el rol (oyente o narrador)
            ]);

            $token = $user->createToken('auth_token')->plainTextToken;

            return response()->json([
                'message' => 'Registro exitoso',
                'user' => $user,
                'token' => $token,
            ], 201);
        }
    }
}
