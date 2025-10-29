const fs = require('fs');
const path = require('path');

// Get all voices from our current voice list (reading the TS file as text)
const voicesFile = fs.readFileSync(path.join(__dirname, '../data/voices.ts'), 'utf8');
const voiceMatches = voicesFile.match(/id:\s*'([^']+)'/g);
const currentVoiceIds = voiceMatches ? voiceMatches.map(match => match.match(/'([^']+)'/)[1]) : [];

// Get all audio files from public/voices directory
const voicesDir = path.join(__dirname, '../../public/voices');
const audioFiles = fs.readdirSync(voicesDir)
  .filter(file => file.endsWith('.wav') || file.endsWith('.mp3'))
  .map(file => file.replace(/\.(wav|mp3)$/, ''));

// Remove duplicates (voices with both wav and mp3)
const uniqueAudioVoices = [...new Set(audioFiles)];

// Voice IDs already extracted above

// Find missing voices (in audio files but not in our list)
const missingVoices = uniqueAudioVoices.filter(audioVoice => 
  !currentVoiceIds.includes(audioVoice)
);

// Find extra voices (in our list but no audio file)
const extraVoices = currentVoiceIds.filter(voiceId => 
  !uniqueAudioVoices.includes(voiceId)
);

console.log('=== VOICE ANALYSIS ===');
console.log(`Total audio files: ${audioFiles.length}`);
console.log(`Unique audio voices: ${uniqueAudioVoices.length}`);
console.log(`Current voice list: ${currentVoiceIds.length}`);
console.log('');

if (missingVoices.length > 0) {
  console.log(`MISSING FROM VOICE LIST (${missingVoices.length}):`);
  missingVoices.forEach(voice => console.log(`  - ${voice}`));
  console.log('');
}

if (extraVoices.length > 0) {
  console.log(`EXTRA IN VOICE LIST (${extraVoices.length}):`);
  extraVoices.forEach(voice => console.log(`  - ${voice}`));
  console.log('');
}

if (missingVoices.length === 0 && extraVoices.length === 0) {
  console.log('✅ All voices are perfectly matched!');
} else {
  console.log(`❌ Found ${missingVoices.length} missing and ${extraVoices.length} extra voices`);
}
