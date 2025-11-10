import { Layout } from "@/components/Layout";

const Impressum = () => {
  return (
    <Layout>
      <div className="container mx-auto px-6 py-16 max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-8">Impressum</h1>
        
        <div className="prose prose-lg max-w-none space-y-6 text-foreground">
          <p>
            <strong>Retail Twin Labs BV</strong><br />
            Legal Form: Besloten Vennootschap<br />
            Registered Office: Wouwermanstraat 38-2, 1071 MA Amsterdam,<br />
            The Netherlands<br />
            Authorized Representatives: Jasper Zeelenberg, Founder & Managing Director
          </p>

          <p>
            <strong>Contact Information:</strong><br />
            Email: hello@retailtwin.com<br />
            Telephone: +31 655 366969
          </p>

          <p>
            <strong>Commercial Register Information:</strong><br />
            Registered at the Dutch Chamber of Commerce, Amsterdam<br />
            Registration Number: 91736501
          </p>

          <p>
            <strong>VAT Identification Number:</strong><br />
            NL865754925B01
          </p>
        </div>
      </div>
    </Layout>
  );
};

export default Impressum;
