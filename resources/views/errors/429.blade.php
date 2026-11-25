@extends('errors.layout')
@section('title', 'Too Many Requests')
@section('code', '429')
@section('heading', 'Too many attempts')
@section('message', 'Too many attempts. Please wait a moment before trying again.')
@section('actions')
    <button type="button" onclick="window.location.reload()" class="btn btn-primary">Try again</button>
    <a href="/" class="btn btn-secondary">Go home</a>
@endsection
@if(!empty($retryAfter))
@section('extra', "Please wait about {$retryAfter} seconds before retrying.")
@endif
