@extends('errors.layout')
@section('title', 'Scheduled Maintenance')
@section('code', '503')
@section('heading', "We'll be right back")
@section('message', "UMAHZ is getting an update. We'll be back in a few minutes.")
@section('actions')
    <button type="button" onclick="window.location.reload()" class="btn btn-primary">Check again</button>
@endsection
