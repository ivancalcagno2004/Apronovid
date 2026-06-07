<?php

namespace App\Notifications;

use Illuminate\Bus\Queueable;
use Illuminate\Notifications\Notification;
use App\Channels\BrevoChannel;

class BrevoResetPasswordNotification extends Notification
{
    use Queueable;

    public $token;

    public function __construct($token)
    {
        $this->token = $token;
    }

    public function via($notifiable)
    {
        return [BrevoChannel::class];
    }

    // 🌟 ESTE ES EL MÉTODO QUE PHP NO ESTABA ENCONTRANDO:
    public function toBrevo($notifiable)
    {
        $resetUrl = 'apronovid://reset-password?token=' . $this->token . '&email=' . $notifiable->email;

        return [
            'to' => [
                [
                    'email' => $notifiable->email,
                    'name' => $notifiable->name
                ]
            ],
            'templateId' => 4, // Tu ID de Brevo
            'params' => [
                'reset_url' => $resetUrl,
                'user_name' => $notifiable->name
            ]
        ];
    }
}
