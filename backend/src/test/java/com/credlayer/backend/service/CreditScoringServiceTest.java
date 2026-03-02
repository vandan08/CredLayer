package com.credlayer.backend.service;

import com.credlayer.backend.model.User;
import com.credlayer.backend.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDateTime;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class CreditScoringServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private OracleUpdateService oracleUpdateService;

    @InjectMocks
    private CreditScoringService creditScoringService;

    private User testUser;
    private final String testAddress = "0x1234567890123456789012345678901234567890";

    @BeforeEach
    void setUp() {
        testUser = new User(testAddress, 500, "C", LocalDateTime.now());
    }

    @Test
    void testApplyRepaymentBonus_ExistingUser() {
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).findById(testAddress);
        verify(userRepository).save(argThat(user -> 
            user.getCurrentScore() == 510 && user.getRiskBand().equals("C")
        ));
        verify(oracleUpdateService).pushScoreToChain(testAddress, 510);
    }

    @Test
    void testApplyRepaymentBonus_NewUser() {
        when(userRepository.findById(testAddress)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository, times(2)).save(any(User.class));
        verify(oracleUpdateService).pushScoreToChain(eq(testAddress), eq(510));
    }

    @Test
    void testApplyRepaymentBonus_ScoreCappedAt1000() {
        testUser.setCurrentScore(995);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> user.getCurrentScore() == 1000));
        verify(oracleUpdateService).pushScoreToChain(testAddress, 1000);
    }

    @Test
    void testApplyRepaymentBonus_BandTransition_CtoB() {
        testUser.setCurrentScore(595);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> 
            user.getCurrentScore() == 605 && user.getRiskBand().equals("B")
        ));
    }

    @Test
    void testApplyRepaymentBonus_BandTransition_BtoA() {
        testUser.setCurrentScore(795);
        testUser.setRiskBand("B");
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> 
            user.getCurrentScore() == 805 && user.getRiskBand().equals("A")
        ));
    }

    @Test
    void testApplyDefaultPenalty_ExistingUser() {
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyDefaultPenalty(testAddress, 1L);

        verify(userRepository).save(argThat(user -> 
            user.getCurrentScore() == 350 && user.getRiskBand().equals("D")
        ));
        verify(oracleUpdateService).pushScoreToChain(testAddress, 350);
    }

    @Test
    void testApplyDefaultPenalty_ScoreFlooredAt0() {
        testUser.setCurrentScore(100);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyDefaultPenalty(testAddress, 1L);

        verify(userRepository).save(argThat(user -> user.getCurrentScore() == 0));
        verify(oracleUpdateService).pushScoreToChain(testAddress, 0);
    }

    @Test
    void testApplyDefaultPenalty_BandTransition_CtoD() {
        testUser.setCurrentScore(500);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyDefaultPenalty(testAddress, 1L);

        verify(userRepository).save(argThat(user -> 
            user.getCurrentScore() == 350 && user.getRiskBand().equals("D")
        ));
    }

    @Test
    void testRiskBandCalculation_BandA() {
        testUser.setCurrentScore(850);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> user.getRiskBand().equals("A")));
    }

    @Test
    void testRiskBandCalculation_BandB() {
        testUser.setCurrentScore(650);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> user.getRiskBand().equals("B")));
    }

    @Test
    void testRiskBandCalculation_BandC() {
        testUser.setCurrentScore(450);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> user.getRiskBand().equals("C")));
    }

    @Test
    void testRiskBandCalculation_BandD() {
        testUser.setCurrentScore(350);
        when(userRepository.findById(testAddress)).thenReturn(Optional.of(testUser));
        when(userRepository.save(any(User.class))).thenReturn(testUser);

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        verify(userRepository).save(argThat(user -> user.getRiskBand().equals("D")));
    }

    @Test
    void testNewUserCreation_DefaultScore500() {
        when(userRepository.findById(testAddress)).thenReturn(Optional.empty());
        when(userRepository.save(any(User.class))).thenAnswer(invocation -> invocation.getArgument(0));

        creditScoringService.applyRepaymentBonus(testAddress, "1000");

        // Verify user was created with default score 500 and then updated to 510
        verify(userRepository, times(2)).save(any(User.class));
        verify(oracleUpdateService).pushScoreToChain(eq(testAddress), eq(510));
    }
}
