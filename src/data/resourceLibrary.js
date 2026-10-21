/** Curated, data-only learning resources keyed by stable subject/topic IDs. */
const playlists = {
  dsa: { title: "Striver's A2Z DSA Course", source: "takeUforward", url: "https://www.youtube.com/playlist?list=PLgUwDviBIf0oF6QL8m22w1hIDC1vJ_BHz", language: "English", description: "Course playlist. Open the lesson matching this topic; the sequence builds from fundamentals to interview patterns." },
  dbms: { title: "DBMS Complete Course", source: "Gate Smashers", url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiFAN6I8CuViBuCdJgiOkT2Y", language: "English", description: "Course playlist. Choose the chapter matching this topic; it follows a conventional DBMS syllabus." },
  os: { title: "Operating Systems Complete Course", source: "Gate Smashers", url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGz9donHRrE9I3Mwn6XdP8p", language: "English", description: "Course playlist. Choose the lesson matching this topic; it covers core OS concepts and exam-style explanations." },
  cn: { title: "Computer Networks Complete Course", source: "Gate Smashers", url: "https://www.youtube.com/playlist?list=PLxCzCOWd7aiGFBD2-2joCpWOLUrDLvVV_", language: "English", description: "Course playlist. Choose the lesson matching this topic; it progresses through network layers and protocols." },
  oop: { title: "Java and DSA course: OOP lessons", source: "Kunal Kushwaha", url: "https://www.youtube.com/playlist?list=PL9gnSGHSqcnr_DxHsP7AW9ftq0AtAyYqJ", language: "English", description: "Course playlist. Select the OOP lessons for the topic, then use the linked Dev.java reference for detail." },
  aptitude: { title: "Quantitative Aptitude Video Lessons", source: "CareerRide", url: "https://www.careerride.com/online-aptitude-test.aspx", language: "English", description: "Free topic-organized aptitude lessons and video tutorials; select the lesson for this topic." },
  "interview-prep": { title: "STAR Method Interview: How to Answer Behavioral Questions (With Examples)", source: "Jay Feng", url: "https://www.youtube.com/watch?v=dRqN4BuhCHU", language: "English", description: "Explains how to structure STAR answers that show impact, ownership, and decision-making in behavioral interviews." },
};

const handbook = (slug) => `https://www.techinterviewhandbook.org/algorithms/${slug}/`;
const indiaBix = (slug) => `https://www.indiabix.com/${slug}/`;
const devJava = (slug) => `https://dev.java/learn/language/oop/${slug}/`;
const cloudflare = (slug) => `https://www.cloudflare.com/${slug.replace(/\/+$/, "")}/`;
const references = {
  dsa: {
    "complexity-analysis": ["Algorithm analysis and asymptotic notation", "MIT OpenCourseWare", "https://ocw.mit.edu/courses/6-006-introduction-to-algorithms-spring-2020/", "Lecture notes and course material for algorithm design and analysis."],
    arrays: ["Array coding interview study guide", "Tech Interview Handbook", handbook("array"), "Array operations, complexity, common pitfalls, and practice prompts."],
    "sorting-search": ["Sorting and searching study guide", "Tech Interview Handbook", handbook("sorting-searching"), "Comparison of sorting/searching techniques, complexity, and interview practice."],
    strings: ["String study guide", "Tech Interview Handbook", handbook("string"), "String operations, complexity, common pitfalls, and practice prompts."],
    "linked-list": ["Linked list study guide", "Tech Interview Handbook", handbook("linked-list"), "Pointer operations, complexity, pitfalls, and linked-list interview practice."],
    "stack-queue": ["Stack and queue study guides", "Tech Interview Handbook", handbook("stack"), "Stack operations and patterns; the handbook also links its queue guide."],
    recursion: ["Recursion study guide", "Tech Interview Handbook", handbook("recursion"), "Base cases, recursive reasoning, complexity, and practice prompts."],
    trees: ["Tree study guide", "Tech Interview Handbook", handbook("tree"), "Tree traversals, complexity, common pitfalls, and interview practice."],
    bst: ["Binary search trees", "OpenDSA", "https://opendsa-server.cs.vt.edu/ODSA/Books/SWDesignAndDataStructs/html/ContentBinarySearchTrees.html", "Explains BST ordering and search, insertion, and removal operations."],
    heap: ["Heap study guide", "Tech Interview Handbook", handbook("heap"), "Heap operations, complexity, and common priority-queue patterns."],
    hashing: ["Hash table study guide", "Tech Interview Handbook", handbook("hash-table"), "Hash-table operations, complexity, collision considerations, and practice."],
    graphs: ["Graph study guide", "Tech Interview Handbook", handbook("graph"), "Graph representations, traversals, complexity, and interview practice."],
    "dynamic-programming": ["Dynamic programming study guide", "Tech Interview Handbook", handbook("dynamic-programming"), "State design, recurrence reasoning, complexity, and practice prompts."],
  },
  dbms: {
    "database-fundamentals": ["SQL and databases full course", "freeCodeCamp", "https://www.freecodecamp.org/news/sql-and-databases-full-course/", "Introduces tables, keys, schemas, constraints, joins, and database concepts."],
    "er-model": ["ER model and database design", "Gate Smashers", "https://www.gatesmashers.com/roadmaps/dbms-sql", "Topic roadmap including ER modeling, entities, relationships, and schema design."],
    "relational-model-sql": ["SQL and databases full course", "freeCodeCamp", "https://www.freecodecamp.org/news/sql-and-databases-full-course/", "Work through relational tables, SQL queries, joins, constraints, and schema basics."],
    normalization: ["Database normalization: 1NF, 2NF, and 3NF", "freeCodeCamp", "https://www.freecodecamp.org/news/database-normalization-1nf-2nf-3nf-table-examples", "Explains normalization through worked table examples and normal forms."],
    "transactions-concurrency": ["Transactions and concurrency control", "Gate Smashers", "https://www.gatesmashers.com/roadmaps/dbms-sql", "Roadmap includes transaction properties, schedules, serializability, and concurrency control."],
    indexing: ["Database indexes", "Use The Index, Luke", "https://use-the-index-luke.com/", "Free, practical guide to how database indexes affect query performance."],
  },
  os: {
    "os-fundamentals": ["Operating Systems: Three Easy Pieces", "University of Wisconsin–Madison", "https://pages.cs.wisc.edu/~remzi/OSTEP/", "Free textbook introducing virtualization, concurrency, and persistence."],
    "processes-threads": ["Processes", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-api.pdf", "Free textbook chapter on process creation, execution, and control."],
    "cpu-scheduling": ["Scheduling", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/cpu-sched.pdf", "Free chapter comparing CPU scheduling policies and their tradeoffs."],
    synchronization: ["Concurrency", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-intro.pdf", "Free chapters introduce threads, synchronization, locks, and condition variables."],
    deadlocks: ["Deadlock", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/threads-deadlock.pdf", "Free chapter explains deadlock conditions, prevention, and avoidance."],
    "memory-management": ["Address spaces", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/vm-intro.pdf", "Free chapter introduces address spaces, memory translation, and virtualization."],
    "file-systems": ["File-system implementation", "OSTEP", "https://pages.cs.wisc.edu/~remzi/OSTEP/file-implementation.pdf", "Free chapter on file-system data structures and implementation."],
  },
  cn: {
    "network-fundamentals": ["What is computer networking?", "Cloudflare Learning Center", cloudflare("learning/network-layer/what-is-the-network-layer/"), "A clear introduction to network layers and packet delivery."],
    "osi-tcpip-models": ["OSI model", "Cloudflare Learning Center", "https://www.cloudflare.com/learning/ddos/glossary/open-systems-interconnection-model-osi/", "Explains the seven-layer OSI model and how it relates to network communication."],
    "data-link-layer": ["Data link layer", "GeeksforGeeks", "https://www.geeksforgeeks.org/computer-networks/data-link-layer/", "Covers framing, addressing, and error handling at the data-link layer."],
    "ip-addressing-routing": ["IP addressing and routing", "Cloudflare Learning Center", "https://www.cloudflare.com/learning/network-layer/what-is-routing/", "Explains how routers forward packets between networks."],
    "tcp-udp": ["What is TCP?", "Cloudflare Learning Center", "https://www.cloudflare.com/learning/ddos/glossary/tcp-ip/", "Introduces TCP and its reliable connection-oriented delivery model."],
    "application-protocols": ["DNS and application protocols", "Cloudflare Learning Center", "https://www.cloudflare.com/learning/dns/what-is-dns/", "Explains DNS resolution, a core application-layer protocol."],
    "network-security": ["TLS and HTTPS", "Cloudflare Learning Center", "https://www.cloudflare.com/learning/ssl/what-is-https/", "Explains how HTTPS and TLS protect application traffic."],
  },
  oop: {
    "classes-objects": ["Classes and objects", "Dev.java", devJava("classes"), "Java tutorial on defining classes, fields, methods, and creating objects."],
    constructors: ["Defining constructors", "Dev.java", "https://dev.java/learn/language/oop/classes-objects/defining-constructors/", "Java tutorial on constructor declarations, parameters, and object initialization."],
    encapsulation: ["Classes and encapsulation", "Dev.java", devJava("classes"), "Use access control and class design to protect an object's state."],
    inheritance: ["Inheritance", "Dev.java", devJava("inheritance"), "Java guide to subclasses, inherited members, and extending a class."],
    polymorphism: ["Polymorphism", "Dev.java", "https://dev.java/learn/language/oop/inheritance/polymorphism/", "Java guide to overriding and polymorphic method calls."],
    "abstraction-interfaces": ["Interfaces and abstraction", "Dev.java", "https://dev.java/learn/interfaces/", "Java tutorial on interfaces as contracts and abstraction boundaries."],
    "solid-principles": ["SOLID principles", "DigitalOcean", "https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design", "Overview of the five object-oriented design principles with examples."],
  },
  aptitude: {
    percentages: ["Percentage questions and answers", "IndiaBIX", indiaBix("aptitude/percentage"), "Solved percentage problems with explanations and practice questions."],
    "ratio-proportion": ["Ratio and proportion questions", "IndiaBIX", indiaBix("aptitude/ratio-and-proportion"), "Worked questions for ratios, proportions, and related placement-test patterns."],
    "profit-loss": ["Profit and loss questions", "IndiaBIX", indiaBix("aptitude/profit-and-loss"), "Solved questions covering cost price, selling price, profit, and loss."],
    "time-work": ["Time and work questions", "IndiaBIX", indiaBix("aptitude/time-and-work"), "Practice work-rate questions with worked explanations."],
    probability: ["Probability questions", "IndiaBIX", indiaBix("aptitude/probability"), "Solved probability problems and practice questions."],
    "logical-reasoning": ["Logical reasoning questions", "IndiaBIX", indiaBix("logical-reasoning/questions-and-answers"), "Topic-organized reasoning questions with answers and explanations."],
    "verbal-ability": ["Verbal ability questions", "IndiaBIX", indiaBix("verbal-ability/questions-and-answers"), "Practice grammar, vocabulary, and verbal reasoning with explanations."],
  },
  "interview-prep": {
    "resume-project-discussion": ["Resume guide", "Tech Interview Handbook", "https://www.techinterviewhandbook.org/resume/", "Practical guidance for presenting experience and preparing a focused resume."],
    "self-introduction": ["Crafting a software-engineering self introduction", "Tech Interview Handbook", "https://www.techinterviewhandbook.org/self-introduction/", "A structured approach to a concise, role-relevant interview introduction."],
    "dsa-interview-patterns": ["Algorithm study cheatsheet", "Tech Interview Handbook", handbook("study-cheatsheet"), "Overview of common coding patterns with links to focused algorithm guides."],
    "cs-fundamentals": ["Technical interview preparation", "GeeksforGeeks", "https://www.geeksforgeeks.org/blogs/interview-preparation/", "Structured prep guidance spanning core computer-science interview topics."],
    "behavioral-questions": ["Behavioral interview questions", "Tech Interview Handbook", "https://www.techinterviewhandbook.org/behavioral-interview-questions/", "Question bank and advice for structuring evidence-based behavioral answers."],
    "mock-interview-preparation": ["System design interview guide", "Tech Interview Handbook", "https://www.techinterviewhandbook.org/system-design/", "A structured guide suitable for practicing technical interview discussion and feedback."],
  },
};

export function getCuratedResources(subjectId, topic) {
  const playlist = playlists[subjectId];
  const reference = references[subjectId]?.[topic.id];
  if (!playlist || !reference) return null;
  const directVideos = {
    "aptitude:percentages": ["Percentage aptitude lesson", "CareerRide", "https://www.youtube.com/watch?v=RWdNhJWwzSs", "Direct lesson on solving percentage questions for quantitative aptitude."],
    "aptitude:profit-loss": ["Profit and loss aptitude lesson", "CareerRide", "https://www.youtube.com/watch?v=T2odvmxqi1I", "Direct lesson on profit, loss, and related aptitude calculations."],
    "aptitude:time-work": ["Time and work aptitude lesson", "CareerRide", "https://www.youtube.com/watch?v=KE7tQf9spPg", "Direct lesson on solving time-and-work quantitative aptitude problems."],
    "aptitude:probability": ["Probability aptitude lesson", "CareerRide", "https://www.youtube.com/watch?v=ximxxERGSUc", "Direct lesson introducing probability problem solving."],
    "interview-prep:behavioral-questions": ["STAR Method Interview: How to Answer Behavioral Questions (With Examples)", "Jay Feng", "https://www.youtube.com/watch?v=dRqN4BuhCHU", "Explains how to structure STAR answers that show impact, ownership, and decision-making in behavioral interviews."],
    "interview-prep:dsa-interview-patterns": ["Striver's A2Z DSA Course", "takeUforward", playlists.dsa.url, "Course playlist covering core DSA patterns. Select the lessons on the relevant pattern before practicing."],
    "interview-prep:cs-fundamentals": ["Computer Science interview topics", "Gate Smashers", playlists.dbms.url, "Course playlist with DBMS concepts used in entry-level computer-science interviews."],
  };
  const direct = directVideos[`${subjectId}:${topic.id}`];
  let first;
  if (direct) {
    first = { type: direct[2].includes("playlist?") ? "YouTube playlist" : "YouTube video", title: direct[0], source: direct[1], url: direct[2], language: "English", description: direct[3] };
  } else if (subjectId === "aptitude" && ["ratio-proportion", "logical-reasoning", "verbal-ability"].includes(topic.id)) {
    first = { type: "Video lesson collection", title: `${topic.title} video lessons`, source: "CareerRide", url: "https://www.careerride.com/online-aptitude-test.aspx", language: "English", description: `Browse the ${topic.title.toLowerCase()} section for its tutorial and video lessons.` };
  } else if (subjectId === "interview-prep") {
    first = { type: "Interview preparation guide", title: `${topic.title} preparation guide`, source: "Tech Interview Handbook", url: "https://www.techinterviewhandbook.org/", language: "English", description: `Use the linked guide for focused preparation on ${topic.title.toLowerCase()}.` };
  } else if (subjectId === "oop") {
    first = { type: "YouTube playlist", title: `${topic.title}: ${playlist.title}`, source: playlist.source, url: playlist.url, language: playlist.language, description: playlist.description };
  } else {
    first = { ...playlist, type: "YouTube playlist", title: `${topic.title}: ${playlist.title}`, description: `${playlist.description} Focus on the ${topic.title} chapter.` };
  }
  return [
    { ...first, id: `study-${topic.id}-1` },
    { id: `study-${topic.id}-2`, type: "Written reference", title: reference[0], source: reference[1], url: reference[2], description: reference[3] },
  ];
}
