import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';

export default function PrivacyPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Header />
      <main className="flex-1 container mx-auto px-4 py-12 md:py-16">
        <div className="prose lg:prose-lg max-w-4xl mx-auto">
          <h1>Privacy Policy</h1>
          <p>
            Welcome to VideoGenius. We are committed to protecting your privacy. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
          </p>

          <h2>1. Information We Collect</h2>
          <p>
            We may collect information about you in a variety of ways. The information we may collect via the Application includes:
          </p>
          <ul>
            <li><strong>Personal Data:</strong> Personally identifiable information, such as your name, email address, and demographic information, that you voluntarily give to us when you register with the Application.</li>
            <li><strong>Project Data:</strong> All data related to the video projects you create, including prompts, generated scenes, and selected assets, are stored in your private user account.</li>
            <li><strong>API Keys:</strong> We store your Gemini API key securely, and it is only used to make requests to the Gemini API on your behalf.</li>
          </ul>

          <h2>2. Use of Your Information</h2>
          <p>
            Having accurate information about you permits us to provide you with a smooth, efficient, and customized experience. Specifically, we may use information collected about you via the Application to:
          </p>
          <ul>
            <li>Create and manage your account.</li>
            <li>Generate video content as requested by you.</li>
            <li>Email you regarding your account or order.</li>
            <li>Increase the efficiency and operation of the Application.</li>
          </ul>

          <h2>3. Security of Your Information</h2>
          <p>
            We use administrative, technical, and physical security measures to help protect your personal information. While we have taken reasonable steps to secure the personal information you provide to us, please be aware that despite our efforts, no security measures are perfect or impenetrable, and no method of data transmission can be guaranteed against any interception or other type of misuse.
          </p>
          
          <h2>4. Contact Us</h2>
          <p>
            If you have questions or comments about this Privacy Policy, please contact us.
          </p>
        </div>
      </main>
      <Footer />
    </div>
  );
}
