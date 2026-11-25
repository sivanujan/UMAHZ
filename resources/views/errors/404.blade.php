@extends('errors.layout')
@section('title', 'Page Not Found')
@section('code', '404')
@section('heading', 'This page took a day off')
@section('message', "We couldn't find the page you're looking for. It may have moved or no longer exists.")
@section('actions')
    <a href="javascript:history.back()" class="btn btn-secondary">Go back</a>
    <a href="/" class="btn btn-primary">Go to home</a>
@endsection
