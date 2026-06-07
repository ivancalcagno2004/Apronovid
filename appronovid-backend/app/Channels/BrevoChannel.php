<?php

namespace App\Channels;

use Illuminate\Notifications\Notification;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Log;

class BrevoChannel
{
    public function send($notifiable, Notification $notification)
    {
        if (!method_exists($notification, 'toBrevo')) {
            return;
        }

        $data = $notification->toBrevo($notifiable);

        $response = Http::withoutVerifying()
            ->withHeaders([
                'api-key' => env('BREVO_API_KEY'),
                'Content-Type' => 'application/json',
                'Accept' => 'application/json',
            ])->post('https://api.brevo.com/v3/smtp/email', $data);

        if ($response->failed()) {
            Log::error('Error enviando mail por Brevo: ' . $response->body());
        }
    }
}
