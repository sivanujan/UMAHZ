@extends('errors.layout')
@section('title', 'Session Expired')
@section('code', '419')
@section('heading', 'Session expired')
@section('message', 'Your session expired for security. Please refresh and try again.')
@section('actions')
    <button type="button" onclick="window.location.reload()" class="btn btn-primary">Refresh page</button>
    <a href="/login" class="btn btn-secondary">Sign in</a>
@endsection
