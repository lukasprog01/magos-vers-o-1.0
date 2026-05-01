<?php
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST, GET, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type");

require_once __DIR__ . '/../config/database.php'; // Conexão PDO


// Recebe dados enviados via POST em formato JSON
$inputJSON = file_get_contents('php://input');
$input = json_decode($inputJSON, TRUE);

// Pega a ação via GET ou POST (JSON)
$action = $_GET['action'] ?? ($input['action'] ?? '');

try {
    switch ($action) {
        
        // ==========================================
        // 1. AUTH: LOGIN
        // ==========================================
        case 'login':
            if (!isset($input['email']) || !isset($input['password'])) {
                echo json_encode(["success" => false, "error" => "Email e senha obrigatórios."]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM users WHERE email = ? LIMIT 1");
            $stmt->execute([$input['email']]);
            $user = $stmt->fetch();
            
            if ($user && $user['password'] === $input['password']) {
                $user['badges'] = json_decode($user['badges'] ?: '[]', true);
                unset($user['password']); 
                echo json_encode(["success" => true, "user" => $user]);
            } else {
                echo json_encode(["success" => false, "error" => "Email ou senha inválidos."]);
            }
            break;

        // ==========================================
        // 2. AUTH: REGISTRO
        // ==========================================
        case 'register':
            if (!isset($input['email'])) {
                echo json_encode(["success" => false, "error" => "Dados inválidos."]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
            $stmt->execute([$input['email']]);
            if ($stmt->fetch()) {
                echo json_encode(["success" => false, "error" => "Email já cadastrado."]);
                exit;
            }
            
            $id = 'usr_' . time(); 
            $avatar = ($input['type'] === 'empresa') ? '🏢' : '🧙‍♂️';
            
            $sql = "INSERT INTO users (id, name, email, password, role, type, company, avatar, badges) 
                    VALUES (?, ?, ?, ?, 'user', ?, ?, ?, '[]')";
            
            $pdo->prepare($sql)->execute([
                $id, $input['name'], $input['email'], $input['password'],
                $input['type'], $input['company'] ?? null, $avatar
            ]);
            
            $stmt = $pdo->prepare("SELECT * FROM users WHERE id = ?");
            $stmt->execute([$id]);
            $user = $stmt->fetch();
            $user['badges'] = [];
            unset($user['password']);
            
            echo json_encode(["success" => true, "user" => $user]);
            break;

        // ==========================================
        // 3. RANKING (LEADERBOARD)
        // ==========================================
        case 'getLeaderboard':
            $stmt = $pdo->query("SELECT id, name, type, avatar, level, xp, company FROM users ORDER BY level DESC, xp DESC LIMIT 20");
            $users = $stmt->fetchAll();
            echo json_encode(["success" => true, "data" => $users]);
            break;

        // ==========================================
        // 4. CHARADAS: BUSCAR PÚBLICAS
        // ==========================================
        case 'getPublicRiddles':
            $sql = "SELECT r.*, u.name as authorName, u.avatar as authorAvatar 
                    FROM riddles r 
                    JOIN users u ON r.authorId = u.id 
                    WHERE r.isActive = 1";
            $params = [];
            
            if (isset($_GET['category']) && $_GET['category'] !== 'todas') {
                $sql .= " AND r.category = ?";
                $params[] = $_GET['category'];
            }
            if (isset($_GET['search']) && !empty($_GET['search'])) {
                $sql .= " AND (r.question LIKE ? OR r.tags LIKE ?)";
                $search = '%' . $_GET['search'] . '%';
                $params[] = $search;
                $params[] = $search;
            }
            
            $sql .= " ORDER BY r.createdAt DESC";
            $stmt = $pdo->prepare($sql);
            $stmt->execute($params);
            
            $riddles = $stmt->fetchAll();
            foreach ($riddles as &$r) {
                $r['tags'] = json_decode($r['tags'] ?: '[]', true);
            }
            echo json_encode(["success" => true, "data" => $riddles]);
            break;

        // ==========================================
        // 5. CHARADAS: MINHAS CHARADAS
        // ==========================================
        case 'getMyRiddles':
            if (!isset($_GET['userId'])) {
                echo json_encode(["success" => false, "error" => "Usuário não fornecido."]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT * FROM riddles WHERE authorId = ? ORDER BY createdAt DESC");
            $stmt->execute([$_GET['userId']]);
            $riddles = $stmt->fetchAll();
            foreach ($riddles as &$r) {
                $r['tags'] = json_decode($r['tags'] ?: '[]', true);
            }
            echo json_encode(["success" => true, "data" => $riddles]);
            break;

        // ==========================================
        // 6. CHARADAS: CHARADA ÚNICA (POR ID)
        // ==========================================
        case 'getRiddle':
            if (!isset($_GET['id'])) {
                echo json_encode(["success" => false, "error" => "ID não fornecido."]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT r.*, u.name as authorName, u.avatar as authorAvatar FROM riddles r JOIN users u ON r.authorId = u.id WHERE r.id = ?");
            $stmt->execute([$_GET['id']]);
            $riddle = $stmt->fetch();
            if ($riddle) {
                $riddle['tags'] = json_decode($riddle['tags'] ?: '[]', true);
                echo json_encode(["success" => true, "data" => $riddle]);
            } else {
                echo json_encode(["success" => false, "error" => "Charada não encontrada."]);
            }
            break;

        // ==========================================
        // 7. CHARADAS: CRIAR NOVA
        // ==========================================
        case 'createRiddle':
            if (!isset($input['authorId']) || !isset($input['question'])) {
                echo json_encode(["success" => false, "error" => "Dados incompletos."]);
                exit;
            }
            $id = 'rid_' . time();
            $points = [50, 100, 150, 200, 300][intval($input['difficulty']) - 1] ?? 100;
            $tags = isset($input['tags']) ? json_encode(array_map('trim', explode(',', $input['tags']))) : '[]';

            $sql = "INSERT INTO riddles (id, authorId, question, answer, hint, category, difficulty, points, tags) 
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)";
            
            $pdo->prepare($sql)->execute([
                $id, $input['authorId'], $input['question'], mb_strtolower(trim($input['answer'])),
                $input['hint'], $input['category'], $input['difficulty'], $points, $tags
            ]);

            // Atualiza status do usuário (XP e contador)
            $pdo->prepare("UPDATE users SET charadasCreated = charadasCreated + 1, xp = xp + 30 WHERE id = ?")->execute([$input['authorId']]);
            
            echo json_encode(["success" => true, "riddleId" => $id]);
            break;

        // ==========================================
        // 8. CHARADAS: VERIFICAR SE JÁ RESPONDEU
        // ==========================================
        case 'hasAnswered':
            if (!isset($_GET['userId']) || !isset($_GET['riddleId'])) {
                echo json_encode(["success" => true, "answered" => false]);
                exit;
            }
            $stmt = $pdo->prepare("SELECT id FROM answers WHERE userId = ? AND riddleId = ? AND correct = 1");
            $stmt->execute([$_GET['userId'], $_GET['riddleId']]);
            echo json_encode(["success" => true, "answered" => (bool)$stmt->fetch()]);
            break;

        // ==========================================
        // 9. RESPONDER CHARADA
        // ==========================================
        case 'answerRiddle':
            if (!isset($input['userId']) || !isset($input['riddleId']) || !isset($input['attempt'])) {
                echo json_encode(["success" => false, "error" => "Dados incorretos."]);
                exit;
            }
            
            // Pega a resposta correta
            $stmt = $pdo->prepare("SELECT answer, points FROM riddles WHERE id = ?");
            $stmt->execute([$input['riddleId']]);
            $riddle = $stmt->fetch();
            
            if (!$riddle) {
                echo json_encode(["success" => false, "error" => "Charada não existe."]);
                exit;
            }

            // Verifica se já estava certo
            $stmt = $pdo->prepare("SELECT id FROM answers WHERE userId = ? AND riddleId = ? AND correct = 1");
            $stmt->execute([$input['userId'], $input['riddleId']]);
            if ($stmt->fetch()) {
                echo json_encode(["success" => false, "error" => "Você já respondeu esta charada!", "alreadyDone" => true]);
                exit;
            }

            $attempt = mb_strtolower(trim($input['attempt']));
            $isCorrect = ($attempt === $riddle['answer']) ? 1 : 0;

            // Insere a resposta (ou atualiza se existir)
            $pdo->prepare("INSERT INTO answers (userId, riddleId, correct, attempts) VALUES (?, ?, ?, 1)
                           ON DUPLICATE KEY UPDATE attempts = attempts + 1, correct = IF(correct=1, 1, ?)")
                ->execute([$input['userId'], $input['riddleId'], $isCorrect, $isCorrect]);

            if ($isCorrect) {
                // Atualiza contagem na charada
                $pdo->prepare("UPDATE riddles SET solvedCount = solvedCount + 1 WHERE id = ?")->execute([$input['riddleId']]);
                
                // Atualiza o mago (XP)
                $pdo->prepare("UPDATE users SET charadasSolved = charadasSolved + 1, xp = xp + ? WHERE id = ?")->execute([$riddle['points'], $input['userId']]);
                
                echo json_encode(["success" => true, "correct" => true, "points" => $riddle['points']]);
            } else {
                echo json_encode(["success" => true, "correct" => false]);
            }
            break;

        // ==========================================
        // 10. ATUALIZAR VISUALIZAÇÕES
        // ==========================================
        case 'updateViews':
            if (isset($_GET['id'])) {
                $pdo->prepare("UPDATE riddles SET views = views + 1 WHERE id = ?")->execute([$_GET['id']]);
            }
            echo json_encode(["success" => true]);
            break;

        // ==========================================
        // 11. CONFIGURAÇÕES: BUSCAR
        // ==========================================
        case 'getSettings':
                $stmt = $pdo->query("SELECT `key`, `value` FROM settings");
                $rows = $stmt->fetchAll();
                $data = [];
                foreach ($rows as $row) {
                    $data[$row['key']] = $row['value'];
                }
                echo json_encode(["success" => true, "data" => $data]);
                break;

            // ==========================================
            // 11. CONFIGURAÇÕES: SALVAR
            // ==========================================
            case 'saveSettings':
                if (!isset($input['key']) || !isset($input['value'])) {
                    echo json_encode(["success" => false, "error" => "Dados inválidos."]);
                    exit;
                }
                $pdo->prepare("INSERT INTO settings (`key`, `value`) VALUES (?, ?) ON DUPLICATE KEY UPDATE `value` = ?")
                    ->execute([$input['key'], $input['value'], $input['value']]);
                echo json_encode(["success" => true]);
                break;

            // ==========================================
            // 12. CHARADA MENSAL ATIVA
            // ==========================================
            case 'getMonthlyRiddle':
                $stmt = $pdo->query("SELECT r.*, u.name as authorName, u.avatar as authorAvatar FROM riddles r JOIN users u ON r.authorId = u.id WHERE r.isMonthly = 1 AND r.isActive = 1 LIMIT 1");
                $riddle = $stmt->fetch();
                if ($riddle) {
                    $riddle['tags'] = json_decode($riddle['tags'] ?: '[]', true);
                    echo json_encode(["success" => true, "data" => $riddle]);
                } else {
                    echo json_encode(["success" => true, "data" => null]);
                }
                break;

            // ==========================================
            // 13. ATIVIDADE RECENTE DO USUÁRIO
            // ==========================================
            case 'getMyActivity':
                if (!isset($_GET['userId'])) {
                    echo json_encode(["success" => false, "error" => "Usuário não fornecido."]);
                    exit;
                }
                $stmt = $pdo->prepare(
                    "SELECT a.*, r.question FROM answers a
                     LEFT JOIN riddles r ON a.riddleId = r.id
                     WHERE a.userId = ?
                     ORDER BY a.answeredAt DESC
                     LIMIT 10"
                );
                $stmt->execute([$_GET['userId']]);
                $activities = $stmt->fetchAll();
                echo json_encode(["success" => true, "data" => $activities]);
                break;

            default:

            echo json_encode(["success" => false, "error" => "Ação não especificada."]);
            break;
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "error" => "Erro interno: " . $e->getMessage()]);
}
?>
