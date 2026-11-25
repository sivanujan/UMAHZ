@extends('errors.layout')
@section('title', 'No Access')
@section('code', '403')
@section('heading', "You don't have access to this page")
@section('message', 'Your account does not have permission to view this workspace or resource.')
@section('actions')
    <a href="/" class="btn btn-primary">Go home</a>
    <a href="/login" class="btn btn-secondary">Switch account</a>
@endsection
