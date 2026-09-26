<?php

namespace App\Console\Commands;

use App\Scribe\ScribeAudioRetention;
use Illuminate\Console\Command;

class PurgeScribeAudio extends Command
{
    protected $signature = 'scribe:purge-audio';

    protected $description = 'Delete raw AI Scribe audio per each clinic\'s retention setting (transcripts are kept)';

    public function handle(ScribeAudioRetention $retention): int
    {
        $count = $retention->purge();

        $this->info("Purged {$count} raw audio chunk(s).");

        return self::SUCCESS;
    }
}
