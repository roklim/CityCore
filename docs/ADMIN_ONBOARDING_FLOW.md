# Flusso guidato città e attività

## Prompt operativo

> Rendi CityCore utilizzabile da un amministratore non tecnico: gestione
> categorie cittadine completa dalla UI, attivazione città guidata, creazione
> attività con prerequisiti evidenti, checklist post-creazione e navigazione
> coerente fino alla pubblicazione. Mantieni API, permessi e routing
> city-first; niente redesign laterale.

## Prima configurazione

1. Aprire `Amministrazione → Città`.
2. Aggiungere un comune dal registry oppure creare una città manualmente.
3. Nella schermata di configurazione, usare `Attiva città`.
4. Creare almeno una categoria attiva, per esempio `Ristoranti`.
5. Aprire `Attività` e creare il locale nella città appena preparata.
6. Scegliere se assegnare subito il gestore. Per un nuovo account indicare una
   password temporanea di almeno 12 caratteri e consegnarla con un canale
   sicuro; un account già registrato conserva la propria password.
7. Seguire il prossimo passaggio indicato nella panoramica dell'attività.
8. Completare profilo, categoria e contatto pubblico, quindi pubblicare.

Una città è pubblica soltanto se è contemporaneamente abilitata e in stato
`Attivo`. Una categoria disattivata resta nello storico ma non può essere
assegnata a nuove attività. Le categorie già assegnate o con sottocategorie
non vengono eliminate: vanno disattivate.

## Gestione ordinaria

- `Città → Categorie` gestisce categorie principali e sottocategorie.
- `Attività → Continua configurazione` apre la panoramica del locale.
- La card `Prossimo passaggio` porta direttamente al primo requisito mancante.
- `Pubblicazione` mostra ogni requisito e il collegamento per correggerlo.
- La pagina pubblica non richiede login; l'autenticazione è riservata alle
  superfici amministrative.
- `Ruoli e accessi` distingue lo stato dell'account dallo stato del grant. Se
  un operatore dimentica la password, un amministratore autorizzato può
  impostarne una temporanea: le sessioni precedenti vengono invalidate.
