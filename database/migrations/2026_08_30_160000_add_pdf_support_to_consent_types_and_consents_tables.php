<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('consent_types', function (Blueprint $table) {
            $table->string('agreement_source')->default('text')->after('description'); // 'text' or 'pdf'
            $table->string('pdf_path')->nullable()->after('body');
            $table->string('pdf_original_name')->nullable()->after('pdf_path');
            $table->unsignedBigInteger('pdf_file_size')->nullable()->after('pdf_original_name');
            $table->unsignedInteger('version')->default(1)->after('pdf_file_size');
        });

        Schema::table('consents', function (Blueprint $table) {
            $table->string('agreement_source')->default('text')->after('consent_type_name'); // 'text' or 'pdf'
            $table->longText('consent_body')->nullable()->change();
            $table->string('signed_pdf_path')->nullable()->after('consent_body');
            $table->string('signed_pdf_original_name')->nullable()->after('signed_pdf_path');
            $table->unsignedBigInteger('signed_pdf_file_size')->nullable()->after('signed_pdf_original_name');
            $table->unsignedInteger('consent_version')->default(1)->after('signed_pdf_file_size');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('consents', function (Blueprint $table) {
            $table->dropColumn([
                'agreement_source',
                'signed_pdf_path',
                'signed_pdf_original_name',
                'signed_pdf_file_size',
                'consent_version',
            ]);
        });

        Schema::table('consent_types', function (Blueprint $table) {
            $table->dropColumn([
                'agreement_source',
                'pdf_path',
                'pdf_original_name',
                'pdf_file_size',
                'version',
            ]);
        });
    }
};
