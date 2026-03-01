package com.credlayer.backend.repository;

import com.credlayer.backend.model.DefaultRecord;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface DefaultRecordRepository extends JpaRepository<DefaultRecord, Long> {
    List<DefaultRecord> findByBorrower(String borrower);
}
