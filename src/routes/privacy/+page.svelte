<script lang="ts">
  // Privacy Policy page
</script>

<svelte:head>
  <title>Privacy Policy - Jotter</title>
</svelte:head>

<div class="min-h-screen bg-gray-50">
  <div class="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
    <div class="text-center mb-12">
      <h1 class="text-4xl font-bold text-gray-900 mb-4">Privacy Policy</h1>
      <p class="text-gray-600">Last updated: January 2026</p>
    </div>

    <div class="bg-white rounded-lg shadow p-8 space-y-8">
      <!-- Introduction -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Introduction</h2>
        <p class="text-gray-700">
          Jotter ("we", "our", or "us") is committed to protecting your privacy. This Privacy Policy
          explains how we collect, use, and safeguard information when you use our note-taking application.
        </p>
      </section>

      <!-- Data We Collect -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Data We Collect</h2>

        <h3 class="text-lg font-medium text-gray-800 mb-2">Account Information</h3>
        <p class="text-gray-700 mb-4">
          When you sign in with Google, we receive your email address and basic profile information
          to create and manage your account.
        </p>

        <h3 class="text-lg font-medium text-gray-800 mb-2">Your Content</h3>
        <p class="text-gray-700 mb-4">
          We store the notes, collections, and other content you create within the app. This data
          is stored securely and is only accessible to you.
        </p>

        <h3 class="text-lg font-medium text-gray-800 mb-2">Usage Analytics</h3>
        <p class="text-gray-700 mb-2">
          To improve our service, we collect anonymous usage data including:
        </p>
        <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li>Types of actions performed (e.g., creating notes, editing sections)</li>
          <li>Timestamps of actions</li>
          <li>Session duration</li>
          <li>Content metadata (e.g., content length, section types) — <strong>not</strong> the actual content</li>
        </ul>
        <p class="text-gray-700 mt-2">
          This data helps us understand how the app is used and identify areas for improvement.
        </p>
      </section>

      <!-- How We Use Your Data -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">How We Use Your Data</h2>
        <ul class="list-disc list-inside text-gray-700 space-y-2 ml-4">
          <li>To provide and maintain the Jotter service</li>
          <li>To authenticate your account</li>
          <li>To sync your data across devices</li>
          <li>To analyze usage patterns and improve the app</li>
          <li>To develop new features (e.g., undo functionality, sync improvements)</li>
        </ul>
      </section>

      <!-- Data Security -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Data Security</h2>
        <p class="text-gray-700">
          Your data is stored securely using Supabase, which provides enterprise-grade security
          including encryption at rest and in transit. We implement row-level security policies
          to ensure you can only access your own data.
        </p>
      </section>

      <!-- Demo Mode -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Demo Mode</h2>
        <p class="text-gray-700">
          When using Jotter without signing in (demo mode), your data is stored locally in your
          browser. We still collect anonymous usage analytics in demo mode to understand how
          new users interact with the app. Demo mode data is not associated with any account.
        </p>
      </section>

      <!-- Data Retention -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Data Retention</h2>
        <p class="text-gray-700">
          Your notes and content are retained as long as your account is active. Usage analytics
          are retained for up to 90 days for analysis purposes. You can delete your account and
          all associated data at any time.
        </p>
      </section>

      <!-- Third Parties -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Third-Party Services</h2>
        <p class="text-gray-700 mb-2">We use the following third-party services:</p>
        <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li><strong>Google OAuth</strong> — for authentication</li>
          <li><strong>Supabase</strong> — for data storage and real-time sync</li>
        </ul>
        <p class="text-gray-700 mt-2">
          We do not sell your data to third parties.
        </p>
      </section>

      <!-- Your Rights -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Your Rights</h2>
        <p class="text-gray-700 mb-2">You have the right to:</p>
        <ul class="list-disc list-inside text-gray-700 space-y-1 ml-4">
          <li>Access your personal data</li>
          <li>Export your data</li>
          <li>Delete your account and data</li>
          <li>Opt out of analytics (contact us)</li>
        </ul>
      </section>

      <!-- Contact -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Contact Us</h2>
        <p class="text-gray-700">
          If you have questions about this Privacy Policy or your data, please contact us through
          our GitHub repository.
        </p>
      </section>

      <!-- Changes -->
      <section>
        <h2 class="text-2xl font-semibold text-gray-900 mb-4">Changes to This Policy</h2>
        <p class="text-gray-700">
          We may update this Privacy Policy from time to time. We will notify you of any changes
          by posting the new Privacy Policy on this page and updating the "Last updated" date.
        </p>
      </section>

      <div class="mt-8 pt-6 border-t">
        <a
          href="/app"
          class="text-blue-600 hover:text-blue-800 font-medium"
        >
          &larr; Back to App
        </a>
      </div>
    </div>
  </div>
</div>
