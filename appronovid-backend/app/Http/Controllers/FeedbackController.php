<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Feedback;
use App\Models\User;
use App\Models\ReadingRequest;
use Illuminate\Support\Facades\Http;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;

class FeedbackController extends Controller
{
    public function index(Request $request)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        // 🌟 AHORA TODO VIENE EXCLUSIVAMENTE DE LA TABLA FEEDBACKS
        $feedbacks = Feedback::with(['user:id,name,email,role', 'request'])->latest()->get()->map(function ($f) {

            $data = [
                'id' => 'fb_' . $f->id,
                'real_id' => $f->id,
                'type' => $f->type,
                'message' => $f->message,
                'created_at' => $f->created_at,
                'user' => $f->user,
            ];

            // Si es un reporte, le sumamos la "caja gris" con la info del pedido
            if ($f->type === 'report' && $f->request) {
                $data['reported_request'] = [
                    'id' => $f->request->id,
                    'title' => $f->request->title,
                    'description_or_text' => $f->request->description_or_text,
                    // 🌟 Contamos en vivo cuántos reportes tiene este pedido
                    'report_count' => Feedback::where('reading_request_id', $f->request->id)->count(),
                ];
            }

            return $data;
        });

        return response()->json($feedbacks);
    }

    public function store(Request $request)
    {
        $request->validate([
            'type' => 'required|in:bug,suggestion',
            'message' => 'required|string|max:5000',
        ]);

        $feedback = Feedback::create([
            'user_id' => $request->user()->id,
            'type' => $request->input('type'),
            'message' => $request->input('message'),
        ]);

        try {
            $admins = User::where('role', 'admin')->whereNotNull('expo_push_token')->get();

            if ($admins->count() > 0) {
                $remitente = $request->user()->name;
                $tipoIcono = $request->input('type') === 'bug' ? '🪲' : '💡';
                $tipoTexto = $request->input('type') === 'bug' ? 'un nuevo error' : 'una nueva sugerencia';

                foreach ($admins as $admin) {
                    Http::withoutVerifying()->post('https://exp.host/--/api/v2/push/send', [
                        'to' => $admin->expo_push_token,
                        'title' => 'Nuevo mensaje en el Buzón 📬',
                        'body' => "{$remitente} envió {$tipoTexto} {$tipoIcono}.",
                        'sound' => 'default',
                    ]);
                }
            }
        } catch (\Exception $e) {
            Log::error('Error enviando push a admins: ' . $e->getMessage());
        }

        return response()->json(['message' => 'Feedback guardado con éxito', 'data' => $feedback], 201);
    }

    // 🌟 Función inteligente que borra el reporte y resucita el pedido si hace falta
    public function destroy(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $realId = str_replace('fb_', '', $id);
        $feedback = Feedback::find($realId);

        if (!$feedback) {
            return response()->json(['message' => 'El reporte no existe (o era un fantasma del sistema anterior).'], 404);
        }

        // Si lo que estás borrando es un Reporte de Pedido
        if ($feedback->type === 'report' && $feedback->reading_request_id) {
            $reqId = $feedback->reading_request_id;

            // Borramos esta queja particular
            $feedback->delete();

            // Chequeamos cuántas quejas le quedan en total a este pedido
            $remainingReports = Feedback::where('reading_request_id', $reqId)->count();

            // Si las quejas bajan de 5, el pedido vuelve a ser visible en el muro
            if ($remainingReports < 5) {
                $req = ReadingRequest::find($reqId);
                if ($req && $req->status === 'reported') {
                    $req->status = 'pending';
                    $req->save();
                }
            }
            return response()->json(['message' => 'Falso reporte ignorado con éxito.']);
        }

        // Si era un error o sugerencia normal, simplemente se borra
        $feedback->delete();
        return response()->json(['message' => 'Mensaje eliminado con éxito']);
    }

    // 🌟 Borra el pedido de la base de datos (y la base de datos borrará sus reportes en cascada)
    public function deleteReportedRequest(Request $request, $id)
    {
        if ($request->user()->role !== 'admin') {
            return response()->json(['message' => 'No autorizado.'], 403);
        }

        $req = ReadingRequest::findOrFail($id);

        // Limpiamos los archivos físicos para que no ocupen memoria en tu servidor
        if ($req->audio_path) {
            Storage::delete('public/' . str_replace('storage/', '', $req->audio_path));
        }
        if ($req->file_path) {
            Storage::delete('public/' . str_replace('storage/', '', $req->file_path));
        }

        $req->delete();

        return response()->json(['message' => 'Pedido eliminado del sistema']);
    }
}
