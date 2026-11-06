import type { Metadata } from "next";
import Link from "next/link";
import { SiteFooter } from "@/components/brand/SiteFooter";
import { ORG_NAME } from "@/lib/constants";

export const metadata: Metadata = { title: "Politique de confidentialité" };

export default function PrivacyPage() {
  return (
    <>
      <main className="mx-auto w-full max-w-3xl flex-1 px-4 py-12">
        <Link href="/" className="text-sm font-semibold text-navy">
          ← Accueil
        </Link>
        <h1 className="mt-4 text-3xl font-extrabold text-navy">Politique de confidentialité</h1>
        <p className="mt-2 text-sm text-ink-soft">Dernière mise à jour : 6 novembre 2026</p>

        <div className="card mt-8 space-y-6 p-6 leading-relaxed text-ink [&_h2]:text-lg [&_h2]:font-bold [&_h2]:text-navy [&_ul]:list-disc [&_ul]:pl-5">
          <section>
            <h2>Responsable du traitement</h2>
            <p>
              Les données sont collectées par le club universitaire {ORG_NAME} (ci-après « EPIK LEADERS ») dans le cadre
              de l&apos;évaluation de ses événements.
            </p>
          </section>
          <section>
            <h2>Données collectées</h2>
            <ul>
              <li>Identité et contact : nom, prénom, adresse e-mail, numéro de téléphone.</li>
              <li>Vos réponses : notes, EPIK LIVE PULSE, recommandation et commentaires libres.</li>
              <li>
                Une empreinte chiffrée et non réversible de votre adresse IP, utilisée uniquement pour limiter les envois
                abusifs. Votre adresse IP elle-même n&apos;est pas conservée.
              </li>
            </ul>
          </section>
          <section>
            <h2>Finalités</h2>
            <ul>
              <li>Mesurer la satisfaction et améliorer la qualité des événements.</li>
              <li>Éviter les réponses en double pour un même événement.</li>
              <li>Produire des statistiques et des analyses internes, présentées de façon agrégée ou anonymisée.</li>
            </ul>
            <p className="mt-2">Vos données ne sont ni vendues, ni louées, ni utilisées à des fins publicitaires.</p>
          </section>
          <section>
            <h2>Base du traitement</h2>
            <p>Votre consentement, recueilli explicitement avant l&apos;envoi du formulaire.</p>
          </section>
          <section>
            <h2>Accès et hébergement</h2>
            <p>
              Seuls les administrateurs autorisés d&apos;EPIK LEADERS peuvent consulter les réponses nominatives. Les
              données sont hébergées par nos prestataires techniques (Supabase pour la base de données, Vercel pour le
              site), qui peuvent les stocker hors de Tunisie, notamment dans l&apos;Union européenne.
            </p>
          </section>
          <section>
            <h2>Durée de conservation</h2>
            <p>
              Les réponses sont conservées pendant une durée définie pour chaque événement (365 jours par défaut), puis
              supprimées.
            </p>
          </section>
          <section>
            <h2>Vos droits</h2>
            <p>
              Vous pouvez demander l&apos;accès, la rectification ou la suppression de vos données en contactant EPIK
              LEADERS via ses canaux officiels (réseaux sociaux du club ou membres du bureau). Votre demande sera traitée
              dans les meilleurs délais.
            </p>
          </section>
          <section>
            <h2>Cadre légal</h2>
            <p>
              EPIK LEADERS s&apos;efforce de respecter la loi organique tunisienne n° 2004-63 du 27 juillet 2004 relative à
              la protection des données à caractère personnel. Cette page est informative et ne constitue pas un avis
              juridique.
            </p>
          </section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
