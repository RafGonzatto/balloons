const width = window.innerWidth;
const height = window.innerHeight;

const config = {
    type: Phaser.AUTO,
    width: width * 0.6,
    height: height,
    backgroundColor: '#87CEEB',
    parent: 'game-container',
    physics: {
        default: 'arcade',
        arcade: {
            gravity: { y: 0 },
            debug: false
        }
    },
    scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH,
    },
    scene: {
        preload: preload,
        create: create,
        update: update
    }
};

const game = new Phaser.Game(config);

let score = 0;
let scoreText;
let balloonGroup;
let shadowGroup;
let moneyPerClick = 10;
let moneySphere;
let sun;
let sunSpeed = 1;
let sunDirection = 1;

// Função para preload dos assets
function preload() {
    this.load.image('balloon', 'assets/balloon.png');
    this.load.image('sphere', 'assets/sphere.png');
    this.load.image('sun', 'assets/sun.png');
}

// Função para criar os elementos do jogo
function create() {
    scoreText = this.add.text(10, 10, 'Money: $0', { fontSize: '24px', fill: '#000' });

    const rows = 4;
    const cols = 4;
    const balloonDimensions = calculateBalloonDimensions();
    const { balloonWidth, balloonHeight, startX, startY, spaceX, spaceY } = balloonDimensions;

    balloonGroup = this.physics.add.group();
    shadowGroup = this.add.group();
    sun = this.add.image(0, 0, 'sun').setDisplaySize(50, 50).setOrigin(0.5, 0.5);

    for (let row = 0; row < rows; row++) {
        for (let col = 0; col < cols; col++) {
            let balloon = balloonGroup.create(startX + col * spaceX, startY + row * spaceY, 'balloon')
                .setDisplaySize(balloonWidth, balloonHeight)
                .setInteractive();
            
            let shadow = this.add.graphics({ fillStyle: { color: 0x000000 } }).setAlpha(0.5);
            shadowGroup.add(shadow);

            balloon.shadow = shadow;

            balloon.on('pointerdown', () => explodeBalloon.call(this, balloon));
            updateShadow.call(this, balloon);
        }
    }

    this.time.addEvent({
        delay: 5000,
        callback: createMoneySphere,
        callbackScope: this,
        loop: true
    });

    setupUpgradeButtons.call(this);
}

// Função para atualizar o jogo a cada frame
function update() {
    if (moneySphere && !this.physics.world.bounds.contains(moneySphere.x, moneySphere.y)) {
        moneySphere.destroy();
        moneySphere = null;
    }

    updateSunPosition.call(this);
    balloonGroup.getChildren().forEach((balloon) => updateShadow.call(this, balloon));
}

// Calcula as dimensões dos balões e as posições iniciais
function calculateBalloonDimensions() {
    const rows = 4;
    const cols = 4;
    const screenArea = config.width * config.height;
    const balloonAreaPercentage = 0.01;
    const balloonArea = screenArea * balloonAreaPercentage;
    const aspectRatio = 2 / 4;
    const balloonWidth = Math.sqrt(balloonArea * aspectRatio);
    const balloonHeight = balloonWidth / aspectRatio;
    const spaceX = config.width * 0.1;
    const spaceY = config.height * 0.2;
    const totalWidth = (cols * balloonWidth) + ((cols - 1) * spaceX);
    const endX = config.width * 0.9;
    const startX = endX - totalWidth;
    const startY = config.height * 0.1;

    return { balloonWidth, balloonHeight, startX, startY, spaceX, spaceY };
}

// Atualiza a posição do sol
function updateSunPosition() {
    sun.x += sunSpeed * sunDirection;
    if (sun.x > config.width - 200 || sun.x < 0) {
        sunDirection *= -1;
    }
}

// Atualiza a sombra de um balão
function updateShadow(balloon) {
    if (!balloon.shadow || !sun) return;

    let shadow = balloon.shadow;
    shadow.clear();

    const shadowOffsetX = -(balloon.x - sun.x) * 0.3;
    const shadowOffsetY = -(balloon.y - sun.y) * 0.007;

    shadow.fillStyle(0x000000, 0.4);
    const shadowWidth = balloon.displayWidth * 0.8;
    const shadowHeight = 3;
    shadow.fillEllipse(balloon.x - shadowOffsetX, balloon.y + balloon.displayHeight / 2 + shadowOffsetY, shadowWidth, shadowHeight);
}

// Explode o balão e atualiza a pontuação
function explodeBalloon(balloon) {
    balloon.disableBody(true, true);

    if (balloon.shadow) {
        balloon.shadow.clear();
        balloon.shadow.destroy();
        balloon.shadow = null;
    }

    score += moneyPerClick;
    scoreText.setText('Money: $' + score);

    this.time.delayedCall(3000, () => {
        balloon.enableBody(true, balloon.x, balloon.y, true, true);
        let shadow = this.add.graphics({ fillStyle: { color: 0x000000 } }).setAlpha(0.5);
        balloon.shadow = shadow;
        updateShadow.call(this, balloon);
    });
}

// Cria a esfera de dinheiro
function createMoneySphere() {
    let randomX = Phaser.Math.Between(0.1 * width, 0.9 * width);
    let randomY = Phaser.Math.Between(0.1 * height, 0.9 * height);

    moneySphere = this.physics.add.image(randomX, randomY, 'sphere')
        .setDisplaySize(0.05 * width, 0.05 * width)
        .setInteractive();

    let randomCurveX = Phaser.Math.Between(-0.2 * width, 0.2 * width);
    let randomCurveY = Phaser.Math.Between(-0.2 * height, 0.2 * height);

    this.tweens.add({
        targets: moneySphere,
        x: randomX + randomCurveX,
        y: randomY + randomCurveY,
        duration: 2000,
        ease: 'Sine.easeInOut',
        yoyo: false,
        onComplete: () => {
            if (moneySphere) {
                escapeMoneySphere.call(this, moneySphere);
            }
        }
    });

    moneySphere.on('pointerdown', () => {
        score += 20;
        scoreText.setText('Money: $' + score);
        moneySphere.destroy();
        moneySphere = null;
    });
}

// Faz a esfera de dinheiro escapar
function escapeMoneySphere(sphere) {
    let directionX = Phaser.Math.Between(-1, 1);
    let directionY = Phaser.Math.Between(-1, 1);
    let speed = Phaser.Math.Between(0.2 * width, 0.3 * width);

    if (sphere && sphere.body) {
        sphere.setVelocity(directionX * speed, directionY * speed);

        this.time.delayedCall(3000, () => {
            if (sphere) {
                sphere.destroy();
            }
        });
    }
}

// Configura os botões de upgrade
function setupUpgradeButtons() {
    document.getElementById('upgrade1').addEventListener('click', () => upgrade(10));
    document.getElementById('upgrade2').addEventListener('click', () => upgrade(20));
    document.getElementById('upgrade3').addEventListener('click', () => upgrade(30));
}

// Atualiza o valor de dinheiro por clique
function upgrade(amount) {
    moneyPerClick += amount;
}
