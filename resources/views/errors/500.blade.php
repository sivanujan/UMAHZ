@extends('errors.layout')
@section('title', 'Server Error')
@section('code', '500')
@section('heading', 'Something went wrong')
@section('message', "Something went wrong on our side. We've been notified.")
@section('actions')
    <button type="button" onclick="window.location.reload()" class="btn btn-primary">Try again</button>
    <a href="/" class="btn btn-secondary">Go home</a>
@endsection
@if(!empty($requestId))
@section('extra', "Reference ID: #{$requestId}")
@endif
