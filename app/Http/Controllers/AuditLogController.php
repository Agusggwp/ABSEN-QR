<?php

namespace App\Http\Controllers;

use App\Models\AuditLog;
use App\Models\User;
use Illuminate\Http\Request;
use Inertia\Inertia;
use Inertia\Response;

class AuditLogController extends Controller
{
    public function index(Request $request): Response
    {
        $action = $request->query('action');
        $userId = $request->query('user_id');
        $date = $request->query('date');
        $perPage = min((int) $request->query('per_page', 25), 100);

        $query = AuditLog::with('user')->latest('created_at');

        if ($action) {
            $query->where('action', 'like', "%{$action}%");
        }

        if ($userId) {
            $query->where('user_id', $userId);
        }

        if ($date) {
            $query->whereDate('created_at', $date);
        }

        $logs = $query->paginate($perPage)->withQueryString();
        $users = User::orderBy('name')->get(['id', 'name', 'role']);

        return Inertia::render('AuditLogs/Index', [
            'logs' => $logs,
            'users' => $users,
            'filters' => [
                'action' => $action,
                'user_id' => $userId,
                'date' => $date,
                'per_page' => $perPage,
            ],
        ]);
    }
}
