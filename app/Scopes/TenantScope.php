<?php

namespace App\Scopes;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Scope;

class TenantScope implements Scope
{
    /**
     * Apply the scope to a given Eloquent query builder.
     */
    public function apply(Builder $builder, Model $model): void
    {
        $tenantId = static::getTenantId();

        if ($tenantId !== null) {
            $builder->where($model->getTable() . '.tenant_id', $tenantId);
        }
    }

    /**
     * Get current active tenant ID from session, request, or runtime context.
     */
    public static function getTenantId(): ?int
    {
        if (app()->bound('current_tenant_id')) {
            return app('current_tenant_id');
        }

        if (session()->has('current_tenant_id')) {
            return session('current_tenant_id');
        }

        return null;
    }
}
