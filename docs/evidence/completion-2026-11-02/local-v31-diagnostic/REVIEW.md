# Local v31 targeted diagnosis

Source `c42dfc7e0c60286330232fb77c822b55407d395d`, prompt `live-guide.31`. The [three original attempts](round-1.json) remain unchanged. The recorder counted GitLab as a pass (43.7 s), Todoist failed (83.5 s), and Forgejo failed (138.8 s). This was a targeted diagnostic, not a complete acceptance round.

The GitLab pass is disqualified: its executable URL used a reserved example origin rather than a real documented API or an instance input. Todoist's minified JSON metadata lost citable scope definitions. Forgejo's source compression dropped the private-repository query contract, and the proposed fallback could not deliver the requested visible-repository collection. No usable-guide release pass is established by this diagnostic.

The following generic corrections preserve JSON metadata as faithful field/value text, retain grant definitions, retain operation parameters ahead of response examples, and normalize only documented reserved sample origins to a user-supplied HTTPS instance. Unknown origins remain rejected.
