/* vault-cues.js
   Purpose: Daily rotating inspirational quotes for the Practice tab
   Usage: Include this script before vault-ui.js
*/

(function(){
  'use strict';

  // Export to global scope
  window.VaultCues = {
    quotes: [
      // Add your 50 quotes here, one per line
      // Format: "Quote text here"
      
      "Practice makes progress",
      "Every beat counts",
      "Rhythm is life",
      "Stay in the pocket",
      "Groove is everything",
      "Feel the subdivision",
      "Play with intention",
      "Less is more",
      "Dynamics tell the story",
      "Serve the song",
      "Listen before you play",
      "Master the fundamentals",
      "Technique unlocks creativity",
      "Be the metronome",
      "Tempo is trust",
      "Consistency beats intensity",
      "Small wins daily",
      "Show up, play on",
      "Your hands remember",
      "Build muscle memory",
      "Repetition refines",
      "Perfect practice makes perfect",
      "Challenge yourself today",
      "Push past the plateau",
      "Embrace the struggle",
      "Mistakes are lessons",
      "Learn from every rep",
      "Focus on the process",
      "Trust your preparation",
      "Stay patient, stay present",
      "Quality over quantity",
      "Play it slow, play it right",
      "Speed comes with time",
      "Celebrate small victories",
      "Keep the dream alive",
      "You're better than yesterday",
      "Progress not perfection",
      "Your journey is unique",
      "Discipline equals freedom",
      "Commit to the craft",
      "Hard work pays off",
      "Show up every day",
      "Make time to practice",
      "Your future self will thank you",
      "Believe in your progress",
      "Stay curious, stay hungry",
      "Practice with purpose",
      "Feel the music",
      "Play from the heart",
      "Let the drums speak"
    ],

    // Get daily quote (cycles based on day of year)
    getDailyQuote: function(){
      var now = new Date();
      var start = new Date(now.getFullYear(), 0, 0);
      var diff = now - start;
      var oneDay = 1000 * 60 * 60 * 24;
      var dayOfYear = Math.floor(diff / oneDay);
      var index = dayOfYear % this.quotes.length;
      return this.quotes[index];
    }
  };
})();
